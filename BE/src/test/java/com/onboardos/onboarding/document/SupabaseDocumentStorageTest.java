package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

@ExtendWith(OutputCaptureExtension.class)
class SupabaseDocumentStorageTest {
    private static final String SECRET = "sb_secret_test_only";

    @Test
    void uploadsPdfWithSecretApiKeyAndNoUpsert() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseDocumentStorage storage = new SupabaseDocumentStorage(builder, "https://project.supabase.co", SECRET, "onboardos-documents");
        UUID workspaceId = UUID.randomUUID();
        server.expect(requestTo(org.hamcrest.Matchers.matchesPattern(
                        "https://project\\.supabase\\.co/storage/v1/object/onboardos-documents/" + workspaceId + "/[0-9a-f-]+\\.pdf")))
                .andExpect(method(HttpMethod.POST)).andExpect(header("apikey", SECRET))
                .andExpect(header("x-upsert", "false")).andExpect(header("Content-Type", MediaType.APPLICATION_PDF_VALUE))
                .andRespond(withSuccess());

        String key = storage.store(workspaceId, new MockMultipartFile("file", "private name.pdf", MediaType.APPLICATION_PDF_VALUE, "%PDF".getBytes()));

        assertThat(key).matches(workspaceId + "/[0-9a-f-]+\\.pdf").doesNotContain("private name");
        server.verify();
    }

    @Test
    void downloadsPrivatePdfForIngest() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseDocumentStorage storage = new SupabaseDocumentStorage(builder, "https://project.supabase.co", SECRET, "bucket");
        String key = UUID.randomUUID() + "/" + UUID.randomUUID() + ".pdf";
        server.expect(requestTo("https://project.supabase.co/storage/v1/object/bucket/" + key))
                .andExpect(method(HttpMethod.GET)).andExpect(header("apikey", SECRET))
                .andRespond(withSuccess("%PDF", MediaType.APPLICATION_PDF));
        assertThat(storage.readText(key)).startsWith("PDF 문서:");
        server.verify();
    }

    @Test
    void reportsMissingConfigurationWithoutLeakingSecrets() {
        SupabaseDocumentStorage storage = new SupabaseDocumentStorage(RestClient.builder(), "", SECRET, "bucket");
        assertThatThrownBy(() -> storage.store(UUID.randomUUID(), new MockMultipartFile("file", new byte[]{1})))
                .isInstanceOfSatisfying(BusinessException.class, ex -> {
                    assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.DOCUMENT_STORAGE_CONFIGURATION_ERROR);
                    assertThat(ex.getMessage()).contains("SUPABASE_URL").doesNotContain(SECRET);
                });
    }

    @Test
    void reportsEachRequiredMissingSetting() {
        MockMultipartFile file = new MockMultipartFile("file", new byte[]{1});
        assertThatThrownBy(() -> new SupabaseDocumentStorage(RestClient.builder(), "https://project.supabase.co", "", "bucket")
                .store(UUID.randomUUID(), file)).hasMessageContaining("SUPABASE_SECRET_KEY");
        assertThatThrownBy(() -> new SupabaseDocumentStorage(RestClient.builder(), "https://project.supabase.co", SECRET, "")
                .store(UUID.randomUUID(), file)).hasMessageContaining("SUPABASE_STORAGE_BUCKET");
    }

    @Test
    void convertsSupabaseHttpErrorsToSafeApplicationError(CapturedOutput output) {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseDocumentStorage storage = new SupabaseDocumentStorage(builder, "https://project.supabase.co", SECRET, "bucket");
        server.expect(requestTo(org.hamcrest.Matchers.containsString("/storage/v1/object/bucket/")))
                .andRespond(withUnauthorizedRequest().body("internal upstream detail " + SECRET));
        assertThatThrownBy(() -> storage.store(UUID.randomUUID(), new MockMultipartFile("file", new byte[]{1})))
                .isInstanceOfSatisfying(BusinessException.class, ex -> {
                    assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.DOCUMENT_STORAGE_ERROR);
                    assertThat(ex.getMessage()).doesNotContain(SECRET).doesNotContain("upstream");
                });
        assertThat(output).contains("Supabase Storage upload failed with HTTP status 401")
                .doesNotContain(SECRET)
                .doesNotContain("internal upstream detail");
    }
}
