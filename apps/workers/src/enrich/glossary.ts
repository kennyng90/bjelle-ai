/**
 * Ordlista. En versjonert datafil i repoet, ikke en databasetabell, fordi den er
 * redaksjonelt innhold som skal gjennom kodegjennomgang som all annen tekst vi
 * publiserer.
 *
 * Nøklene er norske fordi de *er* fagordene. Modellen returnerer bare nøkler og
 * skriver aldri en forklaring selv - det er derfor "emisjon" betyr det samme
 * hver eneste gang en nybegynner møter ordet.
 *
 * Forklaringene er skrevet for noen som eier tre aksjer og ikke kan faget.
 * Ingen av dem sier hva leseren bør gjøre.
 *
 * `unknown_term`-tabellen er mekanismen som lar lista vokse der behovet faktisk
 * er, ikke der vi gjettet.
 */
export const GLOSSARY: Record<string, string> = {
	aksje:
		"En eierandel i et selskap. Eier du én aksje av en million, eier du én milliondel av selskapet.",
	aksjekapital:
		"Summen av det eierne har skutt inn i selskapet, oppgitt i kroner. Endrer seg når det utstedes eller slettes aksjer.",
	aksjesplitt:
		"Selskapet deler hver aksje i flere. Du får flere aksjer som til sammen er verdt det samme som før.",
	amortisering: "Nedbetaling av et lån i avdrag over tid, i stedet for alt på forfallsdagen.",
	avnotering:
		"Selskapet slutter å være børsnotert. Aksjen kan ikke lenger kjøpes og selges på børsen.",
	balanse: "Oversikten over hva selskapet eier og skylder på et gitt tidspunkt.",
	"betinget kapitalforhøyelse":
		"En vedtatt utvidelse av aksjekapitalen som først trer i kraft hvis noe bestemt skjer, for eksempel at opsjoner brukes.",
	"bokført verdi":
		"Verdien en eiendel står oppført med i regnskapet. Kan være høyere eller lavere enn det den ville blitt solgt for.",
	bud: "Et tilbud om å kjøpe aksjene i et selskap, som regel til en pris over børskursen.",
	budplikt:
		"Plikten til å legge inn bud på alle aksjene i et selskap når du har kjøpt deg over en tredel av stemmene.",
	deleiing: "Å eie noe sammen med andre. Brukes om andeler i prosjekter, skip eller eiendom.",
	driftsinntekter:
		"Pengene selskapet tjente på det det faktisk driver med, før kostnader er trukket fra.",
	driftsresultat:
		"Det som er igjen av driftsinntektene etter driftskostnader, men før renter og skatt.",
	"due diligence":
		"Gjennomgangen en kjøper gjør av et selskap før et oppkjøp, for å sjekke at alt stemmer.",
	egenkapital:
		"Verdien av selskapet etter at all gjeld er trukket fra. Det eierne sitter igjen med.",
	"egne aksjer":
		"Aksjer selskapet har kjøpt tilbake fra markedet og eier selv. De gir verken stemmerett eller utbytte.",
	ebit: "Driftsresultat før renter og skatt. Sier noe om hvordan selve driften går, uavhengig av gjeld.",
	ebitda:
		"Driftsresultat før renter, skatt og avskrivninger. Brukes for å sammenligne selskaper med ulik gjeld og ulikt investeringsmønster.",
	emisjon:
		"Selskapet lager nye aksjer og selger dem for å hente inn penger. Eier du fra før og ikke kjøper flere, blir eierandelen din mindre.",
	emisjonskurs: "Prisen de nye aksjene i en emisjon selges for.",
	fisjon: "Et selskap deles i to eller flere selvstendige selskaper.",
	flagging:
		"Meldingen som må sendes når noen krysser en eiergrense i et børsnotert selskap, for eksempel 5, 10 eller 25 prosent.",
	fortrinnsrett:
		"Retten eksisterende eiere har til å kjøpe nye aksjer først i en emisjon, slik at eierandelen deres ikke blir mindre.",
	"fravikelse av fortrinnsretten":
		"Selskapet setter til side retten eksisterende eiere har til å kjøpe nye aksjer først. Da blir eierandelen din mindre uten at du fikk anledning til å hindre det.",
	fripolise: "En ferdig oppspart pensjonsrettighet du tar med deg når du slutter i en jobb.",
	fusjon: "To selskaper slås sammen til ett.",
	garantikonsortium:
		"En gruppe investorer som lover å kjøpe aksjene i en emisjon hvis ingen andre vil. Mot betaling.",
	generalforsamling: "Eiermøtet i et selskap. Her stemmer aksjonærene over de viktigste sakene.",
	gjeldskonvertering:
		"Långivere bytter kravet sitt mot aksjer i stedet for penger. Selskapet slipper gjeld, men eierne blir flere.",
	"going concern":
		"Forutsetningen om at selskapet kommer til å drive videre. Blir den satt i tvil i regnskapet, er det et alvorlig varsel.",
	guiding: "Selskapets egen anslåtte forventning til hvordan det kommer til å gå framover.",
	hovedliste:
		"Den strengeste og mest omsatte lista på Oslo Børs, med de høyeste kravene til selskapene.",
	innsideinformasjon:
		"Opplysninger som ikke er kjent i markedet, og som ville påvirket kursen om de ble kjent. Må meldes så snart som mulig.",
	innløsning:
		"Tvungen utkjøp av de siste småaksjonærene etter at én eier har fått over 90 prosent.",
	investeringsbeslutning:
		"Selskapets endelige ja eller nei til å bruke penger på et stort prosjekt. Ofte det som avgjør om planen blir noe av.",
	isin: "Den internasjonale identifikasjonskoden til et verdipapir. Entydig, i motsetning til navn og ticker.",
	kapitalnedsettelse:
		"Selskapet setter ned aksjekapitalen, ofte for å betale ut penger til eierne eller dekke tap.",
	kapitalforhøyelse: "Selskapet setter opp aksjekapitalen, som regel ved å lage nye aksjer.",
	kontantstrøm:
		"Pengene som faktisk gikk inn og ut av selskapet. Vanskeligere å pynte på enn resultatet.",
	konkurs:
		"Selskapet klarer ikke å betale det det skylder, og blir avviklet. Aksjene er som regel verdiløse.",
	"konvertibelt lån":
		"Et lån som långiveren kan velge å bytte mot aksjer. Blir det gjort, blir eierandelen din mindre.",
	kvartalsrapport:
		"Selskapets regnskap for tre måneder, med tall for inntekter, resultat og som regel utsikter.",
	likviditet:
		"Hvor lett noe kan gjøres om i penger. Om et selskap: om det har nok penger til å betale regningene sine.",
	markedsverdi: "Prisen på alle aksjene til sammen. Antall aksjer ganget med kursen.",
	nedskrivning:
		"Selskapet skriver ned verdien av noe det eier fordi det er verdt mindre enn regnskapet sa. Treffer resultatet.",
	obligasjon: "Et lån delt opp i deler som kan kjøpes og selges. Du er långiver, ikke eier.",
	omsetning: "Hvor mye selskapet solgte for. Sier ingenting alene om det tjente penger.",
	oppkjøp: "Noen kjøper kontroll over et selskap, som regel ved å kjøpe flertallet av aksjene.",
	opsjon:
		"Retten, men ikke plikten, til å kjøpe eller selge noe til en avtalt pris innen en frist.",
	ordrebok:
		"Verdien av avtalt arbeid selskapet ennå ikke har utført. Sier noe om inntektene som kommer.",
	overtegnet: "Flere ville kjøpe i emisjonen enn det fantes aksjer. Da fordeles aksjene.",
	pareto:
		"Et av meglerhusene som ofte hjelper norske selskaper med å hente penger. Ikke en del av selskapet selv.",
	"pik-rente":
		"Renter som ikke betales i kontanter, men legges til lånet. Gjelden vokser i stedet for at pengene forsvinner nå.",
	primærinnsider:
		"Ledelse, styremedlemmer og andre nær selskapet. Handlene deres i egen aksje må meldes offentlig.",
	prospekt:
		"Det juridisk pålagte dokumentet som beskriver et selskap før det henter penger eller noteres.",
	rentedekningsgrad:
		"Hvor mange ganger driftsresultatet dekker rentekostnadene. Lav verdi betyr anstrengt økonomi.",
	"rettet emisjon":
		"Nye aksjer selges til noen utvalgte investorer i stedet for til alle eiere. Rask måte å hente penger på, men eierandelen din blir mindre.",
	refinansiering:
		"Selskapet bytter ut gammel gjeld med ny, som regel med lengre løpetid eller andre vilkår.",
	reparasjonsemisjon:
		"En emisjon som gis til de eierne som ikke fikk være med i en rettet emisjon, slik at de kan kjøpe seg opp igjen.",
	resultat: "Det som er igjen når alle kostnader, renter og skatt er trukket fra inntektene.",
	resultatvarsel:
		"Selskapet sier fra på forhånd at resultatet blir vesentlig bedre eller verre enn ventet.",
	"reverse split":
		"Flere aksjer slås sammen til én. Du får færre aksjer, hver verdt tilsvarende mer.",
	soliditet:
		"Hvor godt selskapet tåler tap. Måles som regel på hvor stor egenkapitalen er i forhold til gjelda.",
	spac: "Et tomt børsnotert selskap som henter penger først og leter etter noe å kjøpe etterpå.",
	stemmerett:
		"Retten til å stemme på generalforsamlingen. Følger som regel aksjen, men ikke alltid.",
	styret: "De som er valgt av eierne til å passe på selskapet og ansette daglig leder.",
	suspensjon:
		"Børsen stopper handelen i aksjen midlertidig, som regel fordi viktig informasjon mangler.",
	tegningsrett:
		"Retten til å kjøpe et bestemt antall nye aksjer i en emisjon. Kan ofte selges videre.",
	tegningskurs: "Prisen du betaler per aksje når du tegner deg i en emisjon.",
	ticker: "Den korte bokstavkoden en aksje handles under på børsen, for eksempel EQNR for Equinor.",
	tilbakekjøpsprogram:
		"Selskapet kjøper egne aksjer i markedet over tid. Færre aksjer igjen betyr at hver av dem eier litt mer.",
	utbytte: "Andelen av overskuddet selskapet betaler ut til eierne i kontanter.",
	utvanning:
		"Eierandelen din blir mindre fordi det er kommet flere aksjer, ikke fordi du har solgt noe. Dette er hovedgrunnen til at en emisjon angår deg.",
	vedtektsendring:
		"Endring i selskapets grunnregler. Krever som regel to tredels flertall på generalforsamlingen.",
	verdifall: "At noe selskapet eier er blitt mindre verdt.",
	vilkårsbrudd:
		"Selskapet har brutt en avtale med långiverne sine, for eksempel et krav til gjeldsgrad. Långiver kan da kreve pengene tilbake.",
	årsrapport:
		"Selskapets fullstendige regnskap og beretning for et helt år, gjennomgått av revisor.",
	"euronext growth":
		"Den minst regulerte lista på Oslo Børs. Lavere krav til selskapene, og som regel mindre og yngre selskaper.",
	"euronext expand": "Mellomlista på Oslo Børs. Strengere krav enn Growth, mildere enn hovedlista.",
	"market making":
		"En avtale om at noen alltid stiller kjøps- og salgspris, slik at aksjen lar seg handle.",
	"lock-up": "En periode der en eier har lovet å ikke selge aksjene sine.",
	bookbuilding:
		"Måten en emisjon prises på: investorene sier hva de vil betale, og prisen settes ut fra det.",
	placing: "Salg av en større aksjepost til utvalgte investorer utenom børsen.",
	nedsalg:
		"En stor eier selger deler av posten sin. Selskapet får ingen penger, det gjør selgeren.",
	innløsningskurs: "Prisen som betales per aksje ved tvungen innløsning av småaksjonærer.",
	revisorberetning: "Revisors uttalelse om regnskapet stemmer. Forbehold her er et varselsignal.",
	forbehold:
		"Et krav som må være oppfylt før en avtale trer i kraft, for eksempel godkjenning fra myndighetene.",
	myndighetsgodkjenning:
		"Tillatelsen et oppkjøp eller en fusjon må ha fra konkurransemyndighetene før det kan gjennomføres.",
	lisens:
		"En offentlig tillatelse til å drive med noe bestemt, for eksempel å lete etter olje i et område.",
	kontrakt: "En bindende avtale om leveranse. For et lite selskap kan én kontrakt være avgjørende.",
	intensjonsavtale:
		"En avtale om å forsøke å bli enige. Ikke bindende, og blir ikke alltid noe av.",
};

/** Nøklene modellen får velge mellom. Fritekst er ikke tillatt. */
export const GLOSSARY_TERMS = Object.keys(GLOSSARY);
