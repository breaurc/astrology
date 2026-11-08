import type { Locale } from "@/lib/i18n";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

const TERMS_VERSION = "2026-11-07";

/** Terms of use (SPEC section 5): the service is for entertainment; credits, conversations, accounts. */
export default function Terms({ locale, controller, email }: { locale: Locale; controller?: string; email?: string }) {
  const ro = locale === "ro";
  const who = controller || "—";
  const contact = email ? <a href={`mailto:${email}`}>{email}</a> : <i>—</i>;
  return (
    <div className="page">
      <SiteHeader locale={locale} />
      <main className="main">
        <div className="wrap legal">
          {ro ? (
            <>
              <h1>Termeni de utilizare</h1>
              <p className="meta">Versiunea {TERMS_VERSION}</p>
              <h2>Ce este Cosmic Triad</h2>
              <p>cosmictriad.com oferă citiri personale pe baza zodiacului occidental, a horoscopului chinezesc și a numerologiei. Serviciul este oferit de <b>{who}</b> și este destinat <b>exclusiv divertismentului</b>. Citirile, răspunsurile și conversațiile nu sunt sfaturi medicale, juridice, financiare sau psihologice și nu înlocuiesc un specialist.</p>
              <h2>Nivelurile serviciului</h2>
              <ul>
                <li><b>Gratuit:</b> o citire scurtă pe zi pentru sistemul ales, fără cont, cu un număr limitat de citiri pe zi per conexiune.</li>
                <li><b>Cont gratuit:</b> datele de naștere salvate, calendarul pe 7 zile și o întrebare pe zi calendaristică (ora locală).</li>
                <li><b>Credite:</b> conversații cu motorul de citire, pe credite preplătite.</li>
              </ul>
              <h2>Credite și plăți</h2>
              <ul>
                <li>Un credit deschide o conversație cu un număr maxim de mesaje afișat în conversație. Când limita e atinsă, conversația se închide; un credit nou deschide una nouă.</li>
                <li>Plata se face prin Stripe; nu vedem niciodată datele cardului. Factura este trimisă de Stripe pe email. Prețurile sunt afișate în EUR și includ TVA acolo unde se aplică.</li>
                <li>Creditele nu expiră. Un credit folosit pentru o conversație în care ai trimis cel puțin un mesaj nu se rambursează; o conversație abandonată fără niciun mesaj returnează creditul.</li>
                <li>Dacă un răspuns nu poate fi generat (motorul nu răspunde), nu se consumă nici întrebarea zilei, nici creditul.</li>
              </ul>
              <h2>Contul tău</h2>
              <ul>
                <li>Contul e destinat persoanelor de cel puțin 16 ani și se creează doar cu acordul tău explicit pentru stocarea datelor de naștere.</li>
                <li>Îți poți descărca datele, șterge datele de naștere sau șterge contul oricând din profil. Ștergerea contului elimină profilul, istoricul, conversațiile și registrul de credite; înregistrările de plată rămân la Stripe conform obligațiilor de facturare.</li>
                <li>Conturile nefolosite 12 luni sunt șterse automat.</li>
              </ul>
              <h2>Utilizare corectă</h2>
              <p>Motorul răspunde doar despre harta ta și ziua ta; întrebările fără legătură, abuzive sau automatizate pot fi refuzate. Ne rezervăm dreptul de a limita sau închide conturile care încalcă acești termeni.</p>
              <h2>Răspundere</h2>
              <p>Serviciul este oferit „așa cum este”. Nu garantăm acuratețea, disponibilitatea sau potrivirea citirilor pentru un scop anume și nu răspundem pentru deciziile luate pe baza lor.</p>
              <h2>Contact și modificări</h2>
              <p>Întrebări: {contact}. Putem actualiza acești termeni; versiunea curentă este cea publicată aici. Vezi și <a href={`/${locale}/privacy`}>politica de confidențialitate</a>.</p>
            </>
          ) : (
            <>
              <h1>Terms of use</h1>
              <p className="meta">Version {TERMS_VERSION}</p>
              <h2>What Cosmic Triad is</h2>
              <p>cosmictriad.com gives personal readings based on the Western zodiac, the Chinese horoscope and numerology. The service is provided by <b>{who}</b> and is <b>for entertainment only</b>. Readings, answers and conversations are not medical, legal, financial or psychological advice and do not replace a professional.</p>
              <h2>Service tiers</h2>
              <ul>
                <li><b>Free:</b> a short daily reading for the chosen system, no account, with a limited number of readings per day per connection.</li>
                <li><b>Free account:</b> saved birth data, the 7-day calendar and one question per calendar day (local time).</li>
                <li><b>Credits:</b> conversations with the reading engine, on prepaid credits.</li>
              </ul>
              <h2>Credits and payments</h2>
              <ul>
                <li>One credit opens one conversation with a maximum number of messages shown in the thread. When the cap is reached the thread closes; a new credit opens a new one.</li>
                <li>Payment runs through Stripe; we never see card data. The invoice is emailed by Stripe. Prices are shown in EUR and include VAT where applicable.</li>
                <li>Credits never expire. A credit used on a conversation where you sent at least one message is not refundable; a conversation abandoned with no messages returns its credit.</li>
                <li>If an answer cannot be generated (the engine does not respond), neither the daily question nor the credit is consumed.</li>
              </ul>
              <h2>Your account</h2>
              <ul>
                <li>Accounts are for people aged 16 or older and are created only with your explicit consent to store birth data.</li>
                <li>You can download your data, delete your birth data or delete the account at any time from your profile. Deleting the account removes the profile, history, conversations and credit ledger; payment records stay with Stripe as required for invoicing.</li>
                <li>Accounts unused for 12 months are deleted automatically.</li>
              </ul>
              <h2>Fair use</h2>
              <p>The engine answers only about your chart and your day; unrelated, abusive or automated requests may be refused. We may limit or close accounts that breach these terms.</p>
              <h2>Liability</h2>
              <p>The service is provided as is. We do not guarantee the accuracy, availability or fitness of readings for any purpose, and we are not liable for decisions taken on their basis.</p>
              <h2>Contact and changes</h2>
              <p>Questions: {contact}. We may update these terms; the current version is the one published here. See also the <a href={`/${locale}/privacy`}>privacy policy</a>.</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
