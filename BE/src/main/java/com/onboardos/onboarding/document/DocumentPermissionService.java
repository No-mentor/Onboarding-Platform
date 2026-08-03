package com.onboardos.onboarding.document;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.UserRole;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DocumentPermissionService {

    public boolean canAccess(DocumentEntity document, Membership membership) {
        if (document == null || document.isDeleted()) {
            return false;
        }
        if (document.getVisibility() == DocumentVisibility.WORKSPACE) {
            return true;
        }
        // RESTRICTED
        List<String> allowed = document.getAllowedRoles();
        if (allowed == null || allowed.isEmpty()) {
            // 제한인데 역할이 비어 있으면 OWNER/ADMIN만
            UserRole role = membership.getRole();
            return role == UserRole.OWNER || role == UserRole.ADMIN;
        }
        return allowed.contains(membership.getRole().name());
    }
}
