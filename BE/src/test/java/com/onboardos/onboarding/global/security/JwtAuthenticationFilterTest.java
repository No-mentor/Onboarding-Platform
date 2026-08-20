package com.onboardos.onboarding.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

class JwtAuthenticationFilterTest {

    private final JwtTokenProvider jwtTokenProvider = mock(JwtTokenProvider.class);
    private final CustomUserDetailsService userDetailsService = mock(CustomUserDetailsService.class);
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint = mock(RestAuthenticationEntryPoint.class);

    private final JwtAuthenticationFilter filter =
            new JwtAuthenticationFilter(jwtTokenProvider, userDetailsService, restAuthenticationEntryPoint);

    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final HttpServletResponse response = mock(HttpServletResponse.class);
    private final FilterChain filterChain = mock(FilterChain.class);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void noAuthorizationHeaderPassesThroughWithoutTouchingUserLookup() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        verifyNoInteractions(userDetailsService, restAuthenticationEntryPoint);
        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void validTokenAndExistingUserSetsAuthenticationAndContinuesChain() throws Exception {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = new UserPrincipal(userId, "user@test.local", "hash", true);
        when(request.getHeader("Authorization")).thenReturn("Bearer valid-token");
        when(jwtTokenProvider.validate("valid-token")).thenReturn(true);
        when(jwtTokenProvider.getUserId("valid-token")).thenReturn(userId);
        when(userDetailsService.loadById(userId)).thenReturn(principal);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(principal);
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(restAuthenticationEntryPoint);
    }

    @Test
    void validTokenButUserMissingFromDbReturns401ViaEntryPointAndSkipsChain() throws Exception {
        UUID userId = UUID.randomUUID();
        when(request.getHeader("Authorization")).thenReturn("Bearer valid-token-deleted-user");
        when(jwtTokenProvider.validate("valid-token-deleted-user")).thenReturn(true);
        when(jwtTokenProvider.getUserId("valid-token-deleted-user")).thenReturn(userId);
        when(userDetailsService.loadById(userId))
                .thenThrow(new UsernameNotFoundException("사용자를 찾을 수 없습니다"));

        filter.doFilterInternal(request, response, filterChain);

        verify(restAuthenticationEntryPoint).commence(eq(request), eq(response), any(UsernameNotFoundException.class));
        verify(filterChain, never()).doFilter(any(), any());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void validSignatureButMalformedUserIdClaimReturns401ViaEntryPointAndSkipsChain() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer forged-token");
        when(jwtTokenProvider.validate("forged-token")).thenReturn(true);
        when(jwtTokenProvider.getUserId("forged-token"))
                .thenThrow(new IllegalArgumentException("Invalid UUID string: not-a-uuid"));

        filter.doFilterInternal(request, response, filterChain);

        verify(restAuthenticationEntryPoint).commence(eq(request), eq(response), any(BadCredentialsException.class));
        verify(userDetailsService, never()).loadById(any());
        verify(filterChain, never()).doFilter(any(), any());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}