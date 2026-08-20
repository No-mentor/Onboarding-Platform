package com.onboardos.onboarding.global.time;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/**
 * Docker/JVM 기본 타임존이 UTC 인 환경에서, 한국 시각 자정~오전 9시 사이에
 * "오늘"이 하루 전 날짜로 계산되지 않는지 확인한다.
 */
class BusinessClockTest {

    @Test
    void utcEveningResolvesToNextDayInSeoul() {
        // UTC 2026-08-20 20:00 == KST 2026-08-21 05:00
        Instant utcEvening = Instant.parse("2026-08-20T20:00:00Z");
        BusinessClock clock = new BusinessClock(Clock.fixed(utcEvening, ZoneOffset.UTC));

        assertThat(clock.today()).isEqualTo(LocalDate.of(2026, 8, 21));
    }

    @Test
    void utcMorningResolvesToSameDayInSeoul() {
        // UTC 2026-08-21 01:00 == KST 2026-08-21 10:00 (같은 날짜)
        Instant utcMorning = Instant.parse("2026-08-21T01:00:00Z");
        BusinessClock clock = new BusinessClock(Clock.fixed(utcMorning, ZoneOffset.UTC));

        assertThat(clock.today()).isEqualTo(LocalDate.of(2026, 8, 21));
    }

    @Test
    void resultIsInsensitiveToTheUnderlyingClockZone() {
        // 기반 Clock 이 어떤 타임존을 갖고 있어도(UTC 든 시스템 기본값이든),
        // BusinessClock 은 항상 Asia/Seoul 기준으로 변환한다.
        Instant instant = Instant.parse("2026-08-20T20:00:00Z");
        BusinessClock utcBased = new BusinessClock(Clock.fixed(instant, ZoneOffset.UTC));
        BusinessClock alreadySeoulBased = new BusinessClock(Clock.fixed(instant, BusinessClock.ZONE));

        assertThat(utcBased.today()).isEqualTo(alreadySeoulBased.today());
    }
}
