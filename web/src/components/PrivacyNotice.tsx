import type { Locale } from "@/lib/i18n";
import { INACTIVITY_MONTHS, MIN_AGE, POLICY_VERSION } from "@/lib/privacy";
import ClearBrowserData from "./ClearBrowserData";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export interface PrivacyConfig {
  controller?: string;   // PRIVACY_CONTROLLER: who runs the site (name, optionally address)
  email?: string;        // PRIVACY_EMAIL: contact for data requests
  hosting?: string;      // PRIVACY_HOSTING: e.g. "Oracle Cloud (Frankfurt)"
  ai?: string;           // PRIVACY_AI: AI provider used for the texts, e.g. "OpenRouter, Inc."
  social: boolean;       // SOCIAL_LOGIN=on
  payments: boolean;     // STRIPE_SECRET_KEY set
}

/** GDPR art. 13 information notice. Plain language, RO and EN. */
export default function PrivacyNotice({ locale, cfg }: { locale: Locale; cfg: PrivacyConfig }) {
  const ro = locale === "ro";
  const missing = !cfg.controller || !cfg.email;
  const contact = cfg.email ? <a href={`mailto:${cfg.email}`}>{cfg.email}</a> : <i>—</i>;
  const hosting = cfg.hosting || (ro ? "furnizorul de găzduire al serverului" : "the server's hosting provider");

  return (
    <div className="page">
      <SiteHeader locale={locale} />
      <main className="main">
        <div className="wrap legal">
          {missing && (
            <div className="alert" role="alert">
              Operator: set <code>PRIVACY_CONTROLLER</code> and <code>PRIVACY_EMAIL</code> in <code>web/.env.local</code> before making the site public.
            </div>
          )}

          {ro ? (
            <>
              <h1>Confidențialitate</h1>
              <p className="meta">Versiunea {POLICY_VERSION}. Serviciul este doar în scop de divertisment.</p>

              <h2>Cine răspunde de date</h2>
              <p>Operatorul datelor este <b>{cfg.controller || "—"}</b>. Pentru orice întrebare sau cerere privind datele tale scrie la {contact}. Răspundem în cel mult o lună.</p>

              <h2>Ce date folosim și de ce</h2>
              <table>
                <thead><tr><th>Date</th><th>Scop</th><th>Temei legal (GDPR)</th></tr></thead>
                <tbody>
                  <tr><td>Data, ora și locul nașterii (cu coordonate și fus orar), numele, numele de la naștere, genul (opțional), interesele alese</td>
                    <td>Calculul hărții natale, al zodiei chinezești, al numerologiei, al calendarului și al citirilor</td>
                    <td>Consimțământul tău, art. 6 alin. (1) lit. a). Îl poți retrage oricând.</td></tr>
                  <tr><td>Email, parolă (stocată doar ca hash scrypt, nu o putem citi), data creării contului, ultima utilizare, limba aleasă</td>
                    <td>Contul tău și autentificarea</td><td>Executarea serviciului pe care l-ai cerut, art. 6 alin. (1) lit. b)</td></tr>
                  <tr><td>Data și versiunea notei la care ți-ai dat acordul</td><td>Dovada consimțământului</td><td>Obligație legală, art. 6 alin. (1) lit. c) și art. 7 alin. (1)</td></tr>
                  <tr><td>Întrebarea zilnică și răspunsul ei, mesajele din conversații, cu data și modelul AI folosit</td>
                    <td>Istoricul tău și contorizarea costului pe funcție</td><td>Executarea serviciului, art. 6 alin. (1) lit. b)</td></tr>
                  <tr><td>Registrul de credite (achiziții, deschideri de conversații, rambursări) și identificatorul sesiunii de plată Stripe</td>
                    <td>Soldul tău și dovada plăților</td><td>Executarea serviciului, art. 6 alin. (1) lit. b); obligații fiscale, lit. c)</td></tr>
                  <tr><td>Un hash zilnic al adresei IP (adresa în sine nu e stocată), încercările eșuate de autentificare (în memorie, 15 minute), adresa IP în jurnalele tehnice</td>
                    <td>Limitarea citirilor gratuite și a conturilor noi pe zi, prevenirea abuzurilor</td><td>Interes legitim, art. 6 alin. (1) lit. f)</td></tr>
                </tbody>
              </table>
              <p>Datele de naștere nu sunt „date sensibile” în sensul art. 9 GDPR. Nu luăm decizii automate cu efecte juridice asupra ta: citirile sunt doar în scop de divertisment. Nu facem marketing, nu vindem și nu partajăm date în scop publicitar.</p>

              <h2>Fără cont</h2>
              <p>Dacă folosești site-ul fără cont, datele introduse sunt trimise serverului doar pentru calcul; nu sunt salvate în baza de date, iar citirea rămâne cel mult o oră în memoria cache a serverului. Răspunsurile din formular rămân în acest browser (localStorage) ca să nu le completezi din nou. Le poți șterge de aici:</p>
              <ClearBrowserData locale={locale} />

              <h2>Cine mai primește date</h2>
              <ul>
                <li><b>Găzduire:</b> {hosting}. Procesează datele doar pentru a rula site-ul.</li>
                <li><b>Căutarea localităților:</b> textul căutat (de ex. „Iași”) este trimis de serverul nostru către Open-Meteo (Elveția). Nu trimitem nimic care să te identifice.</li>
                {cfg.ai && <li><b>Texte generate cu AI:</b> pentru citiri, răspunsuri și conversații trimitem către {cfg.ai} doar faptele astrologice calculate, prenumele (dacă l-ai dat), întrebarea și mesajele conversației, fără email sau datele brute de naștere.</li>}
                {cfg.payments && <li><b>Plăți:</b> Stripe Payments Europe, Ltd. procesează plata și emite factura; primește emailul tău și datele de plată. Noi nu vedem niciodată datele cardului.</li>}
                {cfg.social && <li><b>Google / Facebook:</b> doar dacă alegi să te autentifici cu ei; primim numele, emailul și un identificator al contului.</li>}
              </ul>
              <p>Fonturile sunt găzduite de noi, nu se încarcă de la Google. Dacă un furnizor se află în afara SEE, transferul se bazează pe o decizie de adecvare (de ex. Elveția, EU-US Data Privacy Framework) sau pe clauze contractuale standard.</p>

              <h2>Cât timp păstrăm datele</h2>
              <ul>
                <li>Până când ștergi datele de naștere sau contul (efect imediat). Ștergerea contului elimină profilul, întrebările, conversațiile și registrul de credite; evidențele de plată rămân la Stripe conform obligațiilor de facturare.</li>
                <li>Conturile nefolosite {INACTIVITY_MONTHS} luni sunt șterse automat.</li>
                <li>Contoarele pe adresă IP (hash) sunt șterse după o zi.</li>
              </ul>

              <h2>Drepturile tale</h2>
              <p>Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a-ți retrage consimțământul oricând, fără a afecta prelucrarea anterioară. Pe pagina <a href={`/${locale}/profile#data`}>Profil</a> poți singur(ă): modifica datele, descărca toate datele (JSON), șterge datele de naștere (retragerea acordului) sau șterge contul. Pentru orice altceva scrie la {contact}.</p>
              <p>Poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), <a href="https://www.dataprotection.ro" target="_blank" rel="noopener">dataprotection.ro</a>.</p>

              <h2>Cookie-uri și stocare locală</h2>
              <table>
                <thead><tr><th>Nume</th><th>Rol</th><th>Durată</th></tr></thead>
                <tbody>
                  <tr><td><code>astro_session</code></td><td>Te ține autentificat(ă). Strict necesar.</td><td>30 de zile sau până ieși din cont</td></tr>
                  {cfg.social && <tr><td><code>astro_oauth</code></td><td>Securizează autentificarea cu Google/Facebook. Strict necesar.</td><td>10 minute</td></tr>}
                  <tr><td><code>astro.inputs</code> (localStorage)</td><td>Păstrează datele din formular și sistemul ales în browser.</td><td>Până la ștergere</td></tr>
                </tbody>
              </table>
              <p>Nu folosim cookie-uri de analiză sau publicitate, deci nu e nevoie de un banner de cookie-uri.</p>

              <h2>Vârsta minimă</h2>
              <p>Contul este destinat persoanelor de cel puțin {MIN_AGE} ani. Dacă ai sub {MIN_AGE} ani, folosește site-ul fără cont.</p>

              <h2>Securitate</h2>
              <p>Conexiune criptată (HTTPS), parole stocate ca hash scrypt, cookie de sesiune semnat și inaccesibil scripturilor, verificarea adresei de email, limitarea încercărilor de autentificare, acces la server restricționat.</p>

              <h2>Modificări</h2>
              <p>Dacă schimbăm această notă în mod semnificativ, actualizăm versiunea și îți cerem din nou acordul acolo unde e necesar. Vezi și <a href={`/${locale}/terms`}>termenii de utilizare</a>.</p>
            </>
          ) : (
            <>
              <h1>Privacy</h1>
              <p className="meta">Version {POLICY_VERSION}. The service is for entertainment only.</p>

              <h2>Who is responsible</h2>
              <p>The data controller is <b>{cfg.controller || "—"}</b>. For any question or request about your data, write to {contact}. We answer within one month.</p>

              <h2>What we use and why</h2>
              <table>
                <thead><tr><th>Data</th><th>Purpose</th><th>Legal basis (GDPR)</th></tr></thead>
                <tbody>
                  <tr><td>Date, time and place of birth (with coordinates and time zone), name, name at birth, gender (optional), chosen focus areas</td>
                    <td>Computing your natal chart, Chinese zodiac, numerology, calendar and readings</td>
                    <td>Your consent, art. 6(1)(a). You can withdraw it at any time.</td></tr>
                  <tr><td>Email, password (stored only as a scrypt hash, we can't read it), account creation date, last use, chosen language</td>
                    <td>Your account and sign-in</td><td>Providing the service you asked for, art. 6(1)(b)</td></tr>
                  <tr><td>Date and notice version of your consent</td><td>Proof of consent</td><td>Legal obligation, art. 6(1)(c) and art. 7(1)</td></tr>
                  <tr><td>Your daily question and its answer, conversation messages, with the date and the AI model used</td>
                    <td>Your history and cost accounting per feature</td><td>Providing the service, art. 6(1)(b)</td></tr>
                  <tr><td>The credit ledger (purchases, conversations opened, refunds) and the Stripe checkout session id</td>
                    <td>Your balance and proof of payment</td><td>Providing the service, art. 6(1)(b); tax obligations, (c)</td></tr>
                  <tr><td>A daily hash of your IP address (the address itself is not stored), failed sign-in attempts (in memory, 15 minutes), IP address in technical server logs</td>
                    <td>Limiting free readings and new accounts per day, abuse prevention</td><td>Legitimate interest, art. 6(1)(f)</td></tr>
                </tbody>
              </table>
              <p>Birth data is not a "special category" under art. 9 GDPR. We make no automated decisions with legal effects on you: readings are for entertainment only. No marketing, no selling, no sharing for advertising.</p>

              <h2>Without an account</h2>
              <p>If you use the site without an account, what you enter is sent to the server only to compute the reading; it is not saved in the database, and the reading stays at most one hour in the server's memory cache. Your form answers stay in this browser (localStorage) so you don't have to type them again. You can clear them here:</p>
              <ClearBrowserData locale={locale} />

              <h2>Who else receives data</h2>
              <ul>
                <li><b>Hosting:</b> {hosting}. Processes data only to run the site.</li>
                <li><b>Place search:</b> the text you search for (e.g. "Iași") is sent by our server to Open-Meteo (Switzerland). Nothing that identifies you is sent.</li>
                {cfg.ai && <li><b>AI-written texts:</b> for readings, answers and conversations we send {cfg.ai} only the computed astrological facts, your first name (if given), the question and the conversation messages, never your email or raw birth data.</li>}
                {cfg.payments && <li><b>Payments:</b> Stripe Payments Europe, Ltd. processes the payment and issues the invoice; it receives your email and payment details. We never see card data.</li>}
                {cfg.social && <li><b>Google / Facebook:</b> only if you choose to sign in with them; we receive your name, email and an account identifier.</li>}
              </ul>
              <p>Fonts are served by us, not loaded from Google. Where a provider is outside the EEA, transfers rely on an adequacy decision (e.g. Switzerland, the EU-US Data Privacy Framework) or standard contractual clauses.</p>

              <h2>How long we keep it</h2>
              <ul>
                <li>Until you delete your birth data or your account (immediately). Deleting the account removes the profile, questions, conversations and credit ledger; payment records stay with Stripe as required for invoicing.</li>
                <li>Accounts unused for {INACTIVITY_MONTHS} months are deleted automatically.</li>
                <li>Per-IP (hashed) counters are dropped after one day.</li>
              </ul>

              <h2>Your rights</h2>
              <p>You have the right of access, rectification, erasure, restriction, portability and objection, and you can withdraw consent at any time without affecting earlier processing. On your <a href={`/${locale}/profile#data`}>Profile</a> you can do it yourself: edit your data, download all of it (JSON), delete your birth data (withdraw consent) or delete your account. For anything else, write to {contact}.</p>
              <p>You can complain to the Romanian supervisory authority (ANSPDCP), <a href="https://www.dataprotection.ro" target="_blank" rel="noopener">dataprotection.ro</a>, or to the authority where you live.</p>

              <h2>Cookies and local storage</h2>
              <table>
                <thead><tr><th>Name</th><th>Role</th><th>Duration</th></tr></thead>
                <tbody>
                  <tr><td><code>astro_session</code></td><td>Keeps you signed in. Strictly necessary.</td><td>30 days or until you sign out</td></tr>
                  {cfg.social && <tr><td><code>astro_oauth</code></td><td>Secures Google/Facebook sign-in. Strictly necessary.</td><td>10 minutes</td></tr>}
                  <tr><td><code>astro.inputs</code> (localStorage)</td><td>Keeps your form answers and chosen system in the browser.</td><td>Until cleared</td></tr>
                </tbody>
              </table>
              <p>We use no analytics or advertising cookies, so no cookie banner is needed.</p>

              <h2>Minimum age</h2>
              <p>Accounts are for people aged {MIN_AGE} or older. If you are younger, please use the site without an account.</p>

              <h2>Security</h2>
              <p>Encrypted connection (HTTPS), passwords stored as scrypt hashes, signed session cookie that scripts can't read, email verification, sign-in attempt limits, restricted server access.</p>

              <h2>Changes</h2>
              <p>If we change this notice materially, we update the version and ask for your consent again where needed. See also the <a href={`/${locale}/terms`}>terms of use</a>.</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
