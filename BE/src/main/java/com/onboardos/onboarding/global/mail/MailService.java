package com.onboardos.onboarding.global.mail;

import com.onboardos.onboarding.domain.user.UserRole;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    /** 만료 시각을 메일에 표시할 때 쓰는 기준 시간대 (DB 는 UTC 로 저장한다) */
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Seoul");

    private static final DateTimeFormatter EXPIRES_AT_FORMAT =
            DateTimeFormatter.ofPattern("yyyy년 M월 d일 (E) a h시", Locale.KOREAN);

    private final JavaMailSender mailSender;
    private final MailProperties properties;

    @Async
    public void sendInvitationEmail(
            String toEmail,
            String workspaceName,
            String inviterName,
            UserRole role,
            Instant expiresAt,
            String token
    ) {
        String inviteLink = buildInviteLink(token);
        String expiresAtText = EXPIRES_AT_FORMAT.format(expiresAt.atZone(DISPLAY_ZONE));
        String roleLabel = roleLabel(role);
        String inviter = inviterName == null || inviterName.isBlank() ? null : inviterName;

        String subject = inviter == null
                ? "[MenTalk] " + workspaceName + " 워크스페이스에 초대되었습니다"
                : "[MenTalk] " + inviter + " 님이 " + workspaceName + " 워크스페이스로 초대했습니다";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            // multipart=true: HTML 을 지원하지 않는 클라이언트에는 평문이 보이도록 두 가지를 함께 보낸다
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(properties.getFrom());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(
                    plainBody(toEmail, workspaceName, inviter, roleLabel, expiresAtText, inviteLink),
                    htmlBody(toEmail, workspaceName, inviter, roleLabel, expiresAtText, inviteLink)
            );

            mailSender.send(message);
            log.info("초대 메일 발송 성공: to={}, workspace={}", toEmail, workspaceName);
        } catch (MessagingException | MailException ex) {
            // 초대 자체는 이미 저장되어 있다. 메일 실패로 초대를 되돌리지 않는다
            log.error("초대 메일 발송 실패: to={}, workspace={}", toEmail, workspaceName, ex);
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
        message.setSubject("[MenTalk] 이메일 인증 코드");
        message.setText(
                "MenTalk 이메일 인증 코드입니다.\n\n"
                        + "인증 코드: " + code + "\n\n"
                        + "이 코드는 5분간 유효합니다.\n"
                        + "본인이 요청하지 않았다면 이 메일을 무시해주세요."
        );

        mailSender.send(message);
        log.info("인증 코드 메일 발송 성공: to={}", toEmail);
    }

    private String buildInviteLink(String token) {
        String base = properties.getFrontendUrl().trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/invitations/" + token + "/accept";
    }

    private String plainBody(
            String toEmail,
            String workspaceName,
            String inviterName,
            String roleLabel,
            String expiresAtText,
            String inviteLink
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append(inviterName == null
                        ? workspaceName + " 워크스페이스에 초대되었습니다.\n\n"
                        : inviterName + " 님이 " + workspaceName + " 워크스페이스로 초대했습니다.\n\n")
                .append("초대받은 이메일: ").append(toEmail).append('\n')
                .append("워크스페이스: ").append(workspaceName).append('\n')
                .append("역할: ").append(roleLabel).append('\n')
                .append("만료: ").append(expiresAtText).append("까지\n\n")
                .append("아래 링크를 열어 초대를 수락해 주세요.\n")
                .append(inviteLink).append("\n\n")
                .append("초대는 ").append(toEmail).append(" 계정으로만 수락할 수 있습니다.\n")
                .append("아직 계정이 없다면 링크를 연 뒤 회원가입을 진행하면 됩니다.\n");
        return sb.toString();
    }

    private String htmlBody(
            String toEmail,
            String workspaceName,
            String inviterName,
            String roleLabel,
            String expiresAtText,
            String inviteLink
    ) {
        String headline = inviterName == null
                ? escape(workspaceName) + " 워크스페이스에<br />초대되었습니다"
                : "<strong>" + escape(inviterName) + "</strong> 님이<br />"
                        + escape(workspaceName) + " 워크스페이스로 초대했습니다";

        return """
                <!doctype html>
                <html lang="ko">
                <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
                <body style="margin:0;padding:0;background-color:#f1f5f9;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" \
                style="background-color:#f1f5f9;padding:32px 12px;">
                    <tr><td align="center">
                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" \
                style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;\
                font-family:'Apple SD Gothic Neo',-apple-system,'Malgun Gothic',sans-serif;">

                        <tr><td style="background-color:#0765FC;padding:28px 32px;">
                          <span style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.3px;">MenTalk</span>
                        </td></tr>

                        <tr><td style="padding:36px 32px 8px 32px;">
                          <h1 style="margin:0;font-size:22px;line-height:1.45;color:#0f172a;font-weight:700;">%s</h1>
                          <p style="margin:14px 0 0 0;font-size:14px;line-height:1.7;color:#64748b;">
                            초대를 수락하면 역할에 맞는 30일 온보딩 계획과 오늘 할 일이 준비됩니다.
                          </p>
                        </td></tr>

                        <tr><td style="padding:24px 32px 0 32px;">
                          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" \
                style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                            %s
                            %s
                            %s
                            %s
                          </table>
                        </td></tr>

                        <tr><td style="padding:28px 32px 8px 32px;">
                          <a href="%s" style="display:block;background-color:#0765FC;color:#ffffff;\
                text-decoration:none;text-align:center;padding:15px 20px;border-radius:10px;\
                font-size:15px;font-weight:700;">초대 수락하기</a>
                        </td></tr>

                        <tr><td style="padding:16px 32px 0 32px;">
                          <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">
                            버튼이 열리지 않으면 아래 주소를 브라우저에 붙여 넣어 주세요.<br />
                            <span style="color:#64748b;word-break:break-all;">%s</span>
                          </p>
                        </td></tr>

                        <tr><td style="padding:24px 32px 32px 32px;">
                          <p style="margin:0;padding-top:20px;border-top:1px solid #e2e8f0;\
                font-size:12px;line-height:1.8;color:#94a3b8;">
                            이 초대는 <span style="color:#475569;font-weight:600;">%s</span> 계정으로만 수락할 수 있습니다.
                            아직 계정이 없다면 링크를 연 뒤 회원가입을 진행하면 됩니다.<br />
                            본인이 예상하지 못한 초대라면 이 메일을 무시해 주세요.
                          </p>
                        </td></tr>

                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(
                headline,
                infoRow("초대받은 이메일", escape(toEmail), false),
                infoRow("워크스페이스", escape(workspaceName), true),
                infoRow("부여되는 역할", escape(roleLabel), true),
                infoRow("수락 기한", escape(expiresAtText) + " 까지", true),
                escape(inviteLink),
                escape(inviteLink),
                escape(toEmail)
        );
    }

    private String infoRow(String label, String value, boolean withTopBorder) {
        String border = withTopBorder ? "border-top:1px solid #e2e8f0;" : "";
        return """
                <tr>
                  <td style="padding:13px 18px;%1$sfont-size:13px;color:#64748b;white-space:nowrap;">%2$s</td>
                  <td style="padding:13px 18px;%1$sfont-size:13px;color:#0f172a;font-weight:600;\
                text-align:right;">%3$s</td>
                </tr>
                """.formatted(border, label, value);
    }

    private static String roleLabel(UserRole role) {
        if (role == null) {
            return "구성원";
        }
        return switch (role) {
            case OWNER -> "소유자";
            case ADMIN -> "관리자";
            case MANAGER -> "관리 담당자";
            case MEMBER -> "구성원";
            case NEW_HIRE -> "신입 구성원";
        };
    }

    /** 워크스페이스 이름·사용자 이름은 사용자 입력이므로 HTML 로 해석되지 않게 막는다 */
    private static String escape(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
