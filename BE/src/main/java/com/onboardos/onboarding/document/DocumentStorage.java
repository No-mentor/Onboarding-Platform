package com.onboardos.onboarding.document;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;
public interface DocumentStorage {
    String store(UUID workspaceId, MultipartFile file);
    String readText(String storageKey);
}
