import type { Locale } from "@/lib/i18n";
import { INACTIVITY_MONTHS, MIN_AGE, POLICY_VERSION } from "@/lib/privacy";
import ClearBrowserData from "./ClearBrowserData";
import SiteFooter from "./SiteFooter";

export interface PrivacyConfig {
  controller?: string;   // PRIVACY_CONTROLLER: who runs the site (name, optionally address)
  email?: string;        // PRIVACY_EMAIL: contact for data requests
  hosting?: string;      // PRIVACY_HOSTING: e.g. "Cloudflare, Inc. (tunnel); Oracle Cloud (Frankfurt)"
  ai?: string;           // PRIVACY_AI: AI provider used for answer texts, e.g. "Anthropic PBC"
  social: boolean;       // SOCIAL_LOGIN=on
}

/** GDPR art. 13 information notice. Plain language, RO and EN. */
export default function PrivacyNotice({ locale, cfg }: { locale: Locale; cfg: PrivacyConfig }) {
  const ro = locale === "ro";
  const missing = !cfg.controller || !cfg.email;
  const contact = cfg.email ? <a href={`mailto:${cfg.email}`}>{cfg.email}</a> : <i>—</i>;
  const hosting = cfg.hosting || (ro ? "furnizorul de găzduire al serverului" : "the server's hosting provider");

  return (
    <main className="legal">
      <header className="onboard-top"><a href={`/${locale}`} className="brand">✦ Astro</a>
        <nav className="lang" aria-label="Language">
          {(["ro", "en"] as const).map((l) => <a key={l} href={`/${l}/privacy`} aria-current={l === locale ? "page" : undefined}>{l.toUpperCase()}</a>)}
        </nav>
      </header>
      {missing && (
        <div className="alert" role="alert">
          Operator: set <code>PRIVACY_CONTROLLER</code> and <code>PRIVACY_EMAIL</code> in <code>web/.env.local</code> before making the site public.
        </div>
      )}

      {ro ? (
        <>
          <h1>Confidențialitate</h1>
          <p className="meta">Versiunea {POLICY_VERSION}. Acesta este un proiect demonstrativ, necomercial.</p>

          <h2>Cine răspunde de date</h2>
          <p>Operatorul datelor este <b>{cfg.controller || "—"}</b>. Pentru orice întrebare sau cerere privind datele tale scrie la {contact}. Răspundem în cel mult o lună.</p>

          <h2>Ce date folosim și de ce</h2>
          <table>
            <thead><tr><th>Date</th><th>Scop</th><th>Temei legal (GDPR)</th></tr></thead>
            <tbody>
              <tr><td>Data, ora și locul nașterii (cu coordonate și fus orar), numele, numele de la naștere, genul (opțional), interesele alese</td>
                <td>Calculul hărții natale, al zodiei chinezești, al numerologiei și al citirilor zilnice</td>
                <td>Consimțământul tău, art. 6 alin. (1) lit. a). Îl poți retrage oricând.</td></tr>
              <tr><td>Email, parolă (stocată doar ca hash scrypt, nu o putem citi), data creării contului, ultima utilizare</td>
                <td>Contul tău și autentificarea</td><td>Executarea serviciului pe care l-ai cerut, art. 6 alin. (1) lit. b)</td></tr>
              <tr><td>Data și versiunea notei la care ți-ai dat acordul</td><td>Dovada consimțământului</td><td>Obligație legală, art. 6 alin. (1) lit. c) și art. 7 alin. (1)</td></tr>
              <tr><td>Încercările eșuate de autentificare (în memorie, 15 minute), adresa IP în jurnalele tehnice ale serverului</td>
                <td>Securitate, prevenirea abuzurilor</td><td>Interes legitim, art. 6 alin. (1) lit. f)</td></tr>
              <tr><td>Întrebările puse în caseta „Întreabă despre o zi”</td><td>Generarea răspunsului</td><td>Executarea serviciului, art. 6 alin. (1) lit. b). Nu le salvăm; stau cel mult o oră în memoria cache.</td></tr>
            </tbody>
          </table>
          <p>Datele de naștere nu sunt „date sensibile” în sensul art. 9 GDPR. Nu luăm decizii automate cu efecte juridice asupra ta: citirile sunt doar în scop de divertisment. Nu facem marketing, nu vindem și nu partajăm date în scop publicitar.</p>

          <h2>Fără cont</h2>
          <p>Dacă folosești site-ul fără cont, datele introduse sunt trimise serverului doar pentru calcul; nu sunt salvate, iar rezultatele rămân cel mult o oră în memoria cache a serverului. Răspunsurile din formular rămân în acest browser (localStorage) ca să nu le completezi din nou. Le poți șterge de aici:</p>
          <ClearBrowserData locale={locale} />

          <h2>Cine mai primește date</h2>
          <ul>
            <li><b>Găzduire:</b> {hosting}. Procesează datele doar pentru a rula site-ul.</li>
            <li><b>Căutarea localităților:</b> textul căutat (de ex. „Iași”) este trimis de serverul nostru către Open-Meteo (Elveția). Nu trimitem nimic care să te identifice.</li>
            {cfg.ai && <li><b>Texte generate cu AI:</b> pentru răspunsurile la întrebări, trimitem către {cfg.ai} doar întrebarea și factorii astrologici calculați, fără nume, email sau date de naștere.</li>}
            {cfg.social && <li><b>Google / Facebook:</b> doar dacă alegi să te autentifici cu ei; primim numele, emailul și un identificator al contului.</li>}
          </ul>
          <p>Fonturile sunt găzduite de noi, nu se încarcă de la Google. Dacă un furnizor se află în afara SEE, transferul se bazează pe o decizie de adecvare (de ex. Elveția, EU-US Data Privacy Framework) sau pe clauze contractuale standard.</p>

          <h2>Cât timp păstrăm datele</h2>
          <ul>
            <li>Până când ștergi datele de naștere sau contul (efect imediat).</li>
            <li>Conturile nefolosite {INACTIVITY_MONTHS} luni sunt șterse automat.</li>
            <li>Fiind un demo, toate conturile pot fi resetate oricând.</li>
          </ul>

          <h2>Drepturile tale</h2>
          <p>Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a-ți retrage consimțământul oricând, fără a afecta prelucrarea anterioară. Pe pagina <a href={`/${locale}/me#data`}>Profilul meu</a> poți singur(ă): modifica datele, descărca toate datele (JSON), șterge datele de naștere (retragerea acordului) sau șterge contul. Pentru orice altceva scrie la {contact}.</p>
          <p>Poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), <a href="https://www.dataprotection.ro" target="_blank" rel="noopener">dataprotection.ro</a>.</p>

          <h2>Cookie-uri și stocare locală</h2>
          <table>
            <thead><tr><th>Nume</th><th>Rol</th><th>Durată</th></tr></thead>
            <tbody>
              <tr><td><code>astro_session</code></td><td>Te ține autentificat(ă). Strict necesar.</td><td>30 de zile sau până ieși din cont</td></tr>
              {cfg.social && <tr><td><code>astro_oauth</code></td><td>Securizează autentificarea cu Google/Facebook. Strict necesar.</td><td>10 minute</td></tr>}
              <tr><td><code>astro.draftProfile</code> (localStorage)</td><td>Păstrează răspunsurile din formular în browser.</td><td>Până la salvare sau ștergere</td></tr>
            </tbody>
          </table>
          <p>Nu folosim cookie-uri de analiză sau publicitate, deci nu e nevoie de un banner de cookie-uri.</p>

          <h2>Vârsta minimă</h2>
          <p>Contul este destinat persoanelor de cel puțin {MIN_AGE} ani. Dacă ai sub {MIN_AGE} ani, folosește site-ul fără cont.</p>

          <h2>Securitate</h2>
          <p>Conexiune criptată (HTTPS), parole stocate ca hash scrypt, cookie de sesiune semnat și inaccesibil scripturilor, limitarea încercărilor de autentificare, acces la server restricționat.</p>

          <h2>Modificări</h2>
          <p>Dacă schimbăm această notă în mod semnificativ, actualizăm versiunea și îți cerem din nou acordul acolo unde e necesar.</p>
        </>
      ) : (
        <>
          <h1>Privacy</h1>
          <p className="meta">Version {POLICY_VERSION}. This is a non-commercial demo project.</p>

          <h2>Who is responsible</h2>
          <p>The data controller is <b>{cfg.controller || "—"}</b>. For any question or request about your data, write to {contact}. We answer within one month.</p>

          <h2>What we use and why</h2>
          <table>
            <thead><tr><th>Data</th><th>Purpose</th><th>Legal basis (GDPR)</th></tr></thead>
            <tbody>
              <tr><td>Date, time and place of birth (with coordinates and time zone), name, name at birth, gender (optional), chosen focus areas</td>
                <td>Computing your natal chart, Chinese zodiac, numerology and daily readings</td>
                <td>Your consent, art. 6(1)(a). You can withdraw it at any time.</td></tr>
              <tr><td>Email, password (stored only as a scrypt hash, we can't read it), account creation date, last use</td>
                <td>Your account and sign-in</td><td>Providing the service you asked for, art. 6(1)(b)</td></tr>
              <tr><td>Date and notice version of your consent</td><td>Proof of consent</td><td>Legal obligation, art. 6(1)(c) and art. 7(1)</td></tr>
              <tr><td>Failed sign-in attempts (in memory, 15 minutes), IP address in the server's technical logs</td>
                <td>Security, abuse prevention</td><td>Legitimate interest, art. 6(1)(f)</td></tr>
              <tr><td>Questions typed in the "Ask about a day" box</td><td>Producing the answer</td><td>Providing the service, art. 6(1)(b). Not saved; kept at most one hour in the memory cache.</td></tr>
            </tbody>
          </table>
          <p>Birth data is not a "special category" under art. 9 GDPR. We make no automated decisions with legal effects on you: readings are for entertainment only. No marketing, no selling, no sharing for advertising.</p>

          <h2>Without an account</h2>
          <p>If you use the site without an account, what you enter is sent to the server only to compute the reading; it is not saved, and results stay at most one hour in the server's memory cache. Your form answers stay in this browser (localStorage) so you don't have to type them again. You can clear them here:</p>
          <ClearBrowserData locale={locale} />

          <h2>Who else receives data</h2>
          <ul>
            <li><b>Hosting:</b> {hosting}. Processes data only to run the site.</li>
            <li><b>Place search:</b> the text you search for (e.g. "Iași") is sent by our server to Open-Meteo (Switzerland). Nothing that identifies you is sent.</li>
            {cfg.ai && <li><b>AI-written texts:</b> for answers to questions we send {cfg.ai} only the question and the computed astrological factors, never your name, email or birth data.</li>}
            {cfg.social && <li><b>Google / Facebook:</b> only if you choose to sign in with them; we receive your name, email and an account identifier.</li>}
          </ul>
          <p>Fonts are served by us, not loaded from Google. Where a provider is outside the EEA, transfers rely on an adequacy decision (e.g. Switzerland, the EU-US Data Privacy Framework) or standard contractual clauses.</p>

          <h2>How long we keep it</h2>
          <ul>
            <li>Until you delete your birth data or your account (immediately).</li>
            <li>Accounts unused for {INACTIVITY_MONTHS} months are deleted automatically.</li>
            <li>As this is a demo, all accounts may be reset at any time.</li>
          </ul>

          <h2>Your rights</h2>
          <p>You have the right of access, rectification, erasure, restriction, portability and objection, and you can withdraw consent at any time without affecting earlier processing. On <a href={`/${locale}/me#data`}>My profile</a> you can do it yourself: edit your data, download all of it (JSON), delete your birth data (withdraw consent) or delete your account. For anything else, write to {contact}.</p>
          <p>You can complain to the Romanian supervisory authority (ANSPDCP), <a href="https://www.dataprotection.ro" target="_blank" rel="noopener">dataprotection.ro</a>, or to the authority where you live.</p>

          <h2>Cookies and local storage</h2>
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Duration</th></tr></thead>
            <tbody>
              <tr><td><code>astro_session</code></td><td>Keeps you signed in. Strictly necessary.</td><td>30 days or until you sign out</td></tr>
              {cfg.social && <tr><td><code>astro_oauth</code></td><td>Secures Google/Facebook sign-in. Strictly necessary.</td><td>10 minutes</td></tr>}
              <tr><td><code>astro.draftProfile</code> (localStorage)</td><td>Keeps your form answers in the browser.</td><td>Until saved or cleared</td></tr>
            </tbody>
          </table>
          <p>We use no analytics or advertising cookies, so no cookie banner is needed.</p>

          <h2>Minimum age</h2>
          <p>Accounts are for people aged {MIN_AGE} or older. If you are younger, please use the site without an account.</p>

          <h2>Security</h2>
          <p>Encrypted connection (HTTPS), passwords stored as scrypt hashes, signed session cookie that scripts can't read, sign-in attempt limits, restricted server access.</p>

          <h2>Changes</h2>
          <p>If we change this notice materially, we update the version and ask for your consent again where needed.</p>
        </>
      )}
      <SiteFooter locale={locale} />
    </main>
  );
}
