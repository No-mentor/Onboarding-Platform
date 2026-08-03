package com.onboardos.onboarding.global.security;

import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmailAndDeletedAtIsNull(username.toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + username));
        return new UserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), user.isActive());
    }

    public UserPrincipal loadById(java.util.UUID userId) {
        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다"));
        return new UserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), user.isActive());
    }
}
