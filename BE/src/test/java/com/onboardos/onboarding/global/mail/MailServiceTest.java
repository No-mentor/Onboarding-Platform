package com.onboardos.onboarding.global.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.user.UserRole;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

class MailServiceTest {

    private static final Instant EXPIRES_AT = Instant.parse("2026-08-27T04:01:52Z");

    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final MailProperties properties = properties("https://onboardos.example.com/");
    private final MailService service = new MailService(sender, properties);

    private static MailProperties properties(String frontendUrl) {
        MailProperties props = new MailProperties();
        props.setFrom("no-reply@onboardos.example.com");
        props.setFrontendUrl(frontendUrl);
        return props;
    }

    /** 실제 발송 없이 MimeMessage 를 만들어 주기 위한 빈 sender */
    private MimeMessage stubMimeMessage() {
        MimeMessage message = new JavaMailSenderImpl().createMimeMessage();
        when(sender.createMimeMessage()).thenReturn(message);
        return message;
    }

    private MimeMessage capturedSentMessage() {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(captor.capture());
        return captor.getValue();
    }

    /** multipart/alternative 의 각 파트를 이어 붙인다 (평문 + HTML 을 함께 검사하기 위해) */
    private static String allParts(MimeMessage message) throws Exception {
        return collectParts(message, null);
    }

    /** text/html 파트만. 이스케이프는 HTML 쪽에서만 필요하므로 따로 꺼낸다 */
    private static String htmlPart(MimeMessage message) throws Exception {
        return collectParts(message, "text/html");
    }

    private static String collectParts(MimeMessage message, String mimeTypeFilter) throws Exception {
        // saveChanges() 전에는 각 파트의 Content-Type 헤더가 기록되지 않아
        // 모든 파트가 text/plain 으로 보인다. 실제 발송 시에는 send() 가 이 일을 한다
        message.saveChanges();
        StringBuilder sb = new StringBuilder();
        appendParts((MimeMultipart) message.getContent(), mimeTypeFilter, sb);
        return sb.toString();
    }

    private static void appendParts(MimeMultipart multipart, String mimeTypeFilter, StringBuilder sb)
            throws Exception {
        for (int i = 0; i < multipart.getCount(); i++) {
            var part = multipart.getBodyPart(i);
            Object content = part.getContent();
            if (content instanceof MimeMultipart nested) {
                appendParts(nested, mimeTypeFilter, sb);
            } else if (mimeTypeFilter == null || part.isMimeType(mimeTypeFilter)) {
                sb.append(content).append('\n');
            }
        }
    }

    @Test
    @DisplayName("초대 메일에 초대자·워크스페이스·역할·만료·수락 링크가 모두 담긴다")
    void invitationMailCarriesInvitationContext() throws Exception {
        stubMimeMessage();

        service.sendInvitationEmail(
                "newbie@example.com",
                "팀하성",
                "송하성",
                UserRole.NEW_HIRE,
                EXPIRES_AT,
                "abc123token"
        );

        MimeMessage sent = capturedSentMessage();
        assertThat(sent.getSubject()).isEqualTo("[OnboardOS] 송하성 님이 팀하성 워크스페이스로 초대했습니다");
        assertThat(sent.getAllRecipients()[0].toString()).isEqualTo("newbie@example.com");

        String body = allParts(sent);
        assertThat(body)
                .contains("송하성")
                .contains("팀하성")
                .contains("신입 구성원")
                .contains("newbie@example.com")
                // frontendUrl 끝의 슬래시가 중복되지 않아야 한다
                .contains("https://onboardos.example.com/invitations/abc123token/accept")
                .doesNotContain("https://onboardos.example.com//invitations")
                // 만료 시각은 KST 로 표시한다 (04:01 UTC → 13시)
                .contains("2026년 8월 27일")
                .contains("오후 1시");
    }

    @Test
    @DisplayName("초대자 이름을 모르면 이름 없이도 메일이 만들어진다")
    void invitationMailWorksWithoutInviterName() throws Exception {
        stubMimeMessage();

        service.sendInvitationEmail(
                "newbie@example.com", "팀하성", null, UserRole.MEMBER, EXPIRES_AT, "tok");

        MimeMessage sent = capturedSentMessage();
        assertThat(sent.getSubject()).isEqualTo("[OnboardOS] 팀하성 워크스페이스에 초대되었습니다");
        assertThat(allParts(sent)).contains("구성원");
    }

    @Test
    @DisplayName("워크스페이스 이름의 HTML 특수문자는 이스케이프된다")
    void workspaceNameIsHtmlEscaped() throws Exception {
        stubMimeMessage();

        service.sendInvitationEmail(
                "newbie@example.com",
                "<script>alert(1)</script>",
                null,
                UserRole.MEMBER,
                EXPIRES_AT,
                "tok"
        );

        String html = htmlPart(capturedSentMessage());
        assertThat(html).isNotEmpty();
        assertThat(html).doesNotContain("<script>");
        assertThat(html).contains("&lt;script&gt;");
    }
}
