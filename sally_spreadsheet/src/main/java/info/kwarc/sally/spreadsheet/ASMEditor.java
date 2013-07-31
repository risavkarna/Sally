package info.kwarc.sally.spreadsheet;

import info.kwarc.sally.core.SallyInteractionResultAcceptor;
import info.kwarc.sally.core.SallyContext;
import info.kwarc.sally.core.SallyInteraction;
import info.kwarc.sally.core.SallyService;
import info.kwarc.sally.core.comm.SallyMenuItem;

import javax.ws.rs.GET;

import sally.RangeSelection;
import sally.ScreenCoordinates;
import sally.TheoOpenWindow;

public class ASMEditor {

	@SallyService
	public void ASMEditService(RangeSelection cell, SallyInteractionResultAcceptor acceptor, final SallyContext context) {
		final SallyInteraction sally = context.getCurrentInteraction();
		context.setContextVar("ASMCellRange", cell);
		
		final String session = context.getID();

		acceptor.acceptResult(new SallyMenuItem("Knowledge Base", "Create ontology links") {
			@Override
			public void run() {
				TheoOpenWindow window = TheoOpenWindow.newBuilder()
					.setPosition(ScreenCoordinates.newBuilder().setX(100).setY(100).build())
					.setSizeX(400).setSizeY(500).setTitle("Create Link to Ontology")
					.setUrl("http://localhost:8080/asmeditor?s="+session).build();
				Integer wndid = sally.getOneInteraction(window, Integer.class);
				context.setContextVar("ACMEditorWindowID", wndid);
			}
		});	
	}

	@GET
	public String editor() {
		return "hi";
	}

}
