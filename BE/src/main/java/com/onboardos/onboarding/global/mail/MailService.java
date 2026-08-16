package com.onboardos.onboarding.global.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;
    private final MailProperties properties;

    @Async
    public void sendInvitationEmail(String toEmail, String workspaceName, String token) {
        String inviteLink = properties.getFrontendUrl() + "/invitations/" + token + "/accept";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getFrom());
        message.setTo(toEmail);
        message.setSubject("[OnboardOS] " + workspaceName + " 워크스페이스 초대");
        message.setText(
                workspaceName + " 워크스페이스에 초대되었습니다.\n\n"
                        + "아래 링크를 클릭해 초대를 수락해주세요 (7일 이내 만료):\n"
                        + inviteLink
        );

        try {
            mailSender.send(message);
            log.info("초대 메일 발송 성공: to={}", toEmail);
        } catch (MailException ex) {
            log.error("초대 메일 발송 실패: to={}", toEmail, ex);
        }
    }

    /**
     * 이메일 인증 코드를 동기로 발송합니다.
     * 발송 실패 시 MailException을 그대로 전파합니다.
     */
    public void sendVerificationCode(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getFrom());
        message.setTo(toEmail);
        message.setSubject("[OnboardOS] 이메일 인증 코드");
        message.setText(
                "OnboardOS 이메일 인증 코드입니다.\n\n"
                        + "인증 코드: " + code + "\n\n"
                        + "이 코드는 5분간 유효합니다.\n"
                        + "본인이 요청하지 않았다면 이 메일을 무시해주세요."
        );

        mailSender.send(message);
        log.info("인증 코드 메일 발송 성공: to={}", toEmail);
    }
}