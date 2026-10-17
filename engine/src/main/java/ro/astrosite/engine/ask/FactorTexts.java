package ro.astrosite.engine.ask;

import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;
import ro.astrosite.engine.scoring.Factor;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** Localizes factors using messages_<lang>.properties. */
@Component
public class FactorTexts {

    private final MessageSource messages;

    public FactorTexts(MessageSource messages) {
        this.messages = messages;
    }

    public String text(Factor f, Locale locale) {
        Map<String, String> p = new HashMap<>(f.params());
        // translate enum-like params (planet, sign, category names) when a label exists
        for (String key : new String[]{"transit", "natal", "planet", "sign", "category", "dayAnimal"}) {
            String v = p.get(key);
            if (v != null) p.put(key, label(v, locale));
        }
        String msg = messages.getMessage("factor." + f.code(), null, f.code(), locale);
        for (Map.Entry<String, String> e : p.entrySet()) {
            msg = msg.replace("{" + e.getKey() + "}", e.getValue());
        }
        return msg;
    }

    public String label(String key, Locale locale) {
        return messages.getMessage("label." + key, null, key, locale);
    }

    public String message(String code, Locale locale, Object... args) {
        return messages.getMessage(code, args, code, locale);
    }
}
