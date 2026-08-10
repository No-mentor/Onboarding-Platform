package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.web.client.RestClient;

class DocumentStorageProviderTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(StorageConfiguration.class);

    @Test void defaultsToLocal() {
        contextRunner.run(context -> assertThat(context).hasSingleBean(LocalDocumentStorage.class)
                .doesNotHaveBean(SupabaseDocumentStorage.class));
    }

    @Test void selectsSupabase() {
        contextRunner.withPropertyValues("app.storage.provider=supabase")
                .run(context -> assertThat(context).hasSingleBean(SupabaseDocumentStorage.class)
                        .doesNotHaveBean(LocalDocumentStorage.class));
    }

    @Configuration(proxyBeanMethods = false)
    @Import({LocalDocumentStorage.class, SupabaseDocumentStorage.class})
    static class StorageConfiguration {
        @Bean RestClient.Builder restClientBuilder() { return RestClient.builder(); }
    }
}
