package com.onboardos.onboarding.global.config;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {

    private final List<String> allowedOrigins;

    public CorsProperties(String allowedOrigins) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        if (allowedOrigins != null) {
            Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(origin -> !origin.isEmpty())
                    .forEach(origin -> {
                        if (origin.contains("*")) {
                            throw new IllegalArgumentException("CORS allowed origins must not contain '*'");
                        }
                        normalized.add(origin);
                    });
        }
        this.allowedOrigins = List.copyOf(normalized);
    }

    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }
}
