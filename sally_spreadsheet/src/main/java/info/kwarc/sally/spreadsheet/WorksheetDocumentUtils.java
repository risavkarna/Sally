package info.kwarc.sally.spreadsheet;

import info.kwarc.sally.core.SallyContext;
import info.kwarc.sally.core.SallyInteraction;
import info.kwarc.sally.core.SallyInteractionResultAcceptor;
import info.kwarc.sally.core.SallyService;
import info.kwarc.sally.core.comm.SallyMenuItem;
import info.kwarc.sally.core.comm.SallyModelRequest;
import info.kwarc.sally.core.interfaces.Theo;
import info.kwarc.sally.model.document.spreadsheet.ASMInterface;
import info.kwarc.sally.networking.interfaces.INetworkSender;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.List;

import sally.AlexClick;
import sally.CellData;
import sally.CellPosition;
import sally.DataParameter;
import sally.LegendCreateData;
import sally.MMTUri;
import sally.RangeData;
import sally.RangeData.Builder;
import sally.RangeSelection;
import sally.SpreadsheetModel;

import com.google.inject.Inject;
import com.google.inject.assistedinject.Assisted;

public class WorksheetDocumentUtils {

	INetworkSender sender;
	
	ASMInterface asm;
	String filePath;
	Theo theo;

	public String getFilePath() {
		return filePath;
	}
	
	@Inject
	public WorksheetDocumentUtils(@Assisted String filePath, @Assisted SpreadsheetModel data, @Assisted INetworkSender sender) {
		asm = new ASMInterface(filePath);
		setSemanticData(data);
	}

	public void setSemanticData(SpreadsheetModel msg) {
		asm.reconstruct(msg);		
	}

	public void setSemanticData(String fileName) {
		try {
			FileInputStream file = new FileInputStream(fileName);
			setSemanticData(SpreadsheetModel.parseFrom(file));
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public int getSheetId(String sheetName) {
		return asm.getWorksheetIDByName(sheetName);
	}

	/**
	 * Returns the MMT uri corresponding to a clicked position
	 * @param click
	 * @return
	 */
	public String getSemantics(CellPosition click) {
		return asm.getOntologyForPosition(click);
	}

	public List<Integer> getFBForRange(RangeSelection range) {
		return asm.getFunctionalBlockIDs(range);
	}

	public List<Integer> getLabelsForRange(RangeSelection range) {
		return asm.getLabelBlockIDs(range);
	}

	/**
	 * Heuristic to get a position in the speadsheet matching the MMT uri
	 * @param mmtURI
	 * @return
	 */
	public CellPosition getPositionFromMMTURI(String mmtURI) {
		List<Integer> structs = asm.getListOntologyStructures(mmtURI);
		if (structs.size() == 0)
			return null;
		int structId = structs.get(0);
		RangeSelection sel = asm.getBlockPosition(structId);
		return CellPosition.newBuilder().setSheet(Integer.parseInt(sel.getSheet())).setCol(sel.getStartCol()).setRow(sel.getStartRow()).build();
	}

	@SallyService(channel="/get/semantics")
	public void getModel(SallyModelRequest click, SallyInteractionResultAcceptor acceptor, SallyContext context) {
		acceptor.acceptResult(asm.getRDFModel());
	}


	@SallyService(channel="/service/alex/selectRange")
	public void alexClickInteraction(AlexClick click, SallyInteractionResultAcceptor acceptor, SallyContext context) {
		System.out.println(filePath);
		if (!click.getFileName().equals(filePath)) {
			return;
		}
		final SallyInteraction interaction = context.getCurrentInteraction();

		context.setContextVar("preferred_position", click.getPosition());

		int sheet = getSheetId(click.getSheet());
		RangeSelection sel = click.getRange();

		CellPosition pos = CellPosition.newBuilder().setSheet(sheet).setRow(sel.getStartRow()).setCol(sel.getStartCol()).build();

		List<SallyMenuItem> items;

		MMTUri mmtURI = interaction.getOneInteraction(pos, MMTUri.class);
		items = interaction.getPossibleInteractions(sel, SallyMenuItem.class);
		items.addAll(interaction.getPossibleInteractions(mmtURI, SallyMenuItem.class));

		SallyMenuItem item = interaction.getOneInteraction(items, SallyMenuItem.class);
		if (item != null) {
			item.run();
		}
	}

	public void createLabelBlock(RangeSelection range, String ontology) {
		Builder rangeData = RangeData.newBuilder();
		int sheetID = asm.getWorksheetIDByName(range.getSheet());
		for (int row=range.getStartRow(); row<=range.getEndRow(); ++row) {
			for (int col=range.getStartCol(); row<=range.getEndCol(); ++col) {
				CellData data = CellData.newBuilder().setPosition(sally.CellSpaceInformation.newBuilder().setWidth(1).setHeight(1).setPosition( sally.CellPosition.newBuilder().setSheet(sheetID).setCol(row).setRow(col).build()).build()).setValue("").build();
				rangeData.addCells(data);
			}
		}
		asm.createLegend(LegendCreateData.newBuilder().setFileName(filePath).setParameter(DataParameter.SameContentSameElement).setItems(rangeData.build()).build());
	}

	@SallyService
	public void getPositionFromMMTURI(MMTUri uri, SallyInteractionResultAcceptor acceptor, SallyContext context) {
		acceptor.acceptResult(getPositionFromMMTURI(uri.getUri()));
	}

	@SallyService
	public void getSemantics(CellPosition click, SallyInteractionResultAcceptor acceptor, SallyContext context) {
		String uri = getSemantics(click);
		if (uri != null)
			acceptor.acceptResult(MMTUri.newBuilder().setUri(uri).build());
	}

}
