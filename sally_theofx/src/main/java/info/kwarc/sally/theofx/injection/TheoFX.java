package info.kwarc.sally.theofx.injection;

import info.kwarc.sally.core.interfaces.Theo;
import info.kwarc.sally.theofx.TheoService;

import com.google.inject.AbstractModule;

public class TheoFX extends AbstractModule {

	@Override
	protected void configure() {
		bind(Theo.class).to(TheoService.class);
	}

}
