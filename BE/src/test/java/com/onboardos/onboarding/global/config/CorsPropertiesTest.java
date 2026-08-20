package com.onboardos.onboarding.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

class CorsPropertiesTest {

    @Test void parsesMultipleOrigins() {
        CorsProperties properties = new CorsProperties(
                "http://localhost:3000,http://127.0.0.1:3000,https://frontend.example.com");
        assertThat(properties.getAllowedOrigins()).containsExactly(
                "http://localhost:3000", "http://127.0.0.1:3000", "https://frontend.example.com");
    }

    @Test void trimsDropsEmptyEntriesAndRemovesDuplicatesInOrder() {
        CorsProperties properties = new CorsProperties(
                " http://localhost:3000, ,https://frontend.example.com,,http://localhost:3000 ");
        assertThat(properties.getAllowedOrigins()).containsExactly(
                "http://localhost:3000", "https://frontend.example.com");
    }

    @Test void rejectsGlobalWildcard() {
        assertThatThrownBy(() -> new CorsProperties("*"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must not contain");
    }

    @Test void rejectsWildcardOriginPattern() {
        assertThatThrownBy(() -> new CorsProperties("https://*.example.com"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void nullValueProducesNoImplicitWildcard() {
        assertThat(new CorsProperties(null).getAllowedOrigins()).isEqualTo(List.of());
    }
}
