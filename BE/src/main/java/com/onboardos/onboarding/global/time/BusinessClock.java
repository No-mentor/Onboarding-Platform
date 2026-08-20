package com.onboardos.onboarding.global.time;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * "오늘 날짜"라는 비즈니스 의미(30일 계획의 dayIndex, 오늘의 추천 날짜, 대시보드 현재 일차 등)를
 * 한국 사용자 기준(Asia/Seoul)으로 계산하는 공통 시계.
 *
 * Docker/JVM 기본 타임존이 UTC 인 환경에서 단순히 {@code LocalDate.now()} 를 쓰면, 한국 시각
 * 자정~오전 9시 사이에는 UTC 로 전날 날짜가 계산되어(예: KST 08-21 05:00 == UTC 08-20 20:00)
 * "오늘 할 일"이 하루 전 기준으로 조회·생성되는 문제가 있었다. 이 클래스는 그 계산만 담당한다.
 *
 * {@code java.time.Clock} 을 감싼 전용 타입으로 두는 이유는, 문서 정리 배치가 쓰는 UTC 시계
 * ({@code SchedulingConfig.systemClock}, {@code Instant.now(clock)} 전용)와 타입이 겹치지
 * 않게 해서 DI 모호성(@Qualifier 없이도 항상 하나로 정해짐) 없이 안전하게 공존시키기 위함이다.
 *
 * {@code created_at}/{@code updated_at} 같은 Instant 타임스탬프는 이 클래스와 무관하게 그대로
 * UTC 로 저장된다(hibernate.jdbc.time_zone=UTC 유지). 이 클래스는 날짜(LocalDate) 계산에만 쓴다.
 */
public class BusinessClock {

    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private final Clock delegate;

    public BusinessClock(Clock delegate) {
        this.delegate = delegate;
    }

    /**
     * 한국 기준 오늘 날짜.
     * delegate 가 어떤 타임존을 갖고 있든(예: Docker 기본값인 UTC) {@link #ZONE} 으로 다시
     * 투영한다. delegate 의 시각(instant)만 신뢰하고, delegate 자체의 zone 은 쓰지 않는다 —
     * 그래야 "이 시계를 어떤 zone 으로 만들었는지"에 기대지 않고 항상 한국 날짜가 나온다.
     */
    public LocalDate today() {
        return LocalDate.now(delegate.withZone(ZONE));
    }
}
