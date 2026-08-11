package com.onboardos.onboarding.document;

import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import java.io.IOException;
import java.net.URI;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "supabase")
public class SupabaseDocumentStorage implements DocumentStorage {
    private final RestClient restClient;
    private final String url;
    private final String secretKey;
    private final String bucket;
    public SupabaseDocumentStorage(RestClient.Builder builder, @Value("${app.storage.supabase-url:}") String url,
            @Value("${app.storage.supabase-secret-key:}") String secretKey,
            @Value("${app.storage.supabase-bucket:}") String bucket) {
        this.restClient = builder.build();
        this.url = url == null ? "" : url.replaceFirst("/+$", "");
        this.secretKey = secretKey;
        this.bucket = bucket;
    }
    @Override public String store(UUID workspaceId, MultipartFile file) {
        validateConfiguration();
        String key = workspaceId + "/" + UUID.randomUUID() + ".pdf";
        try {
            restClient.post().uri(objectUri(key)).header("apikey", secretKey).header("x-upsert", "false")
                    .contentType(MediaType.APPLICATION_PDF).body(file.getBytes()).retrieve().toBodilessEntity();
            return key;
        } catch (RestClientResponseException e) {
            logHttpFailure("upload", e);
            throw uploadFailure();
        } catch (IOException | RestClientException e) {
            logCommunicationFailure("upload", e);
            throw uploadFailure();
        }
    }
    private BusinessException uploadFailure() {
        return new BusinessException(ErrorCode.DOCUMENT_STORAGE_ERROR, "Supabase Storage에 문서를 업로드하지 못했습니다.");
    }
    @Override public String readText(String storageKey) {
        validateConfiguration();
        try {
            byte[] content = restClient.get().uri(objectUri(storageKey)).header("apikey", secretKey)
                    .accept(MediaType.APPLICATION_PDF).retrieve().body(byte[].class);
            if (content == null || content.length == 0) return "";
            return LocalDocumentStorage.pdfPlaceholder(storageKey.substring(storageKey.lastIndexOf('/') + 1));
        } catch (RestClientResponseException e) {
            logHttpFailure("read", e);
            throw readFailure();
        } catch (RestClientException e) {
            logCommunicationFailure("read", e);
            throw readFailure();
        }
    }
    private BusinessException readFailure() {
        return new BusinessException(ErrorCode.DOCUMENT_STORAGE_ERROR, "Supabase Storage에서 문서를 읽지 못했습니다.");
    }
    @Override public void delete(String storageKey) {
        validateConfiguration();
        try {
            restClient.delete().uri(objectUri(storageKey)).header("apikey", secretKey)
                    .retrieve().toBodilessEntity();
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) return;
            logHttpFailure("delete", e);
            throw deleteFailure();
        } catch (RestClientException e) {
            logCommunicationFailure("delete", e);
            throw deleteFailure();
        }
    }
    private BusinessException deleteFailure() {
        return new BusinessException(ErrorCode.DOCUMENT_STORAGE_ERROR, "Supabase Storage에서 문서를 삭제하지 못했습니다.");
    }
    private void logHttpFailure(String operation, RestClientResponseException exception) {
        log.warn("Supabase Storage {} failed with HTTP status {}", operation, exception.getStatusCode().value());
    }
    private void logCommunicationFailure(String operation, Exception exception) {
        log.warn("Supabase Storage {} communication failed: {}", operation, exception.getClass().getSimpleName());
    }
    private URI objectUri(String key) {
        validateStorageKey(key);
        return UriComponentsBuilder.fromUriString(url).pathSegment("storage", "v1", "object", bucket)
                .pathSegment(key.split("/")).build().encode().toUri();
    }
    private void validateStorageKey(String key) {
        if (!StringUtils.hasText(key)) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "올바르지 않은 문서 저장 경로입니다.");
        String[] segments = key.split("/", -1);
        for (String segment : segments) {
            if (segment.isBlank() || segment.equals(".") || segment.equals("..")) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "올바르지 않은 문서 저장 경로입니다.");
            }
        }
    }
    private void validateConfiguration() {
        if (!StringUtils.hasText(url)) throw configError("SUPABASE_URL 설정이 필요합니다.");
        if (!StringUtils.hasText(secretKey)) throw configError("SUPABASE_SECRET_KEY 설정이 필요합니다.");
        if (!StringUtils.hasText(bucket)) throw configError("SUPABASE_STORAGE_BUCKET 설정이 필요합니다.");
    }
    private BusinessException configError(String message) { return new BusinessException(ErrorCode.DOCUMENT_STORAGE_CONFIGURATION_ERROR, message); }
}
