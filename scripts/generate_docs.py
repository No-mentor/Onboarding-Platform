#!/usr/bin/env python3
"""
OnboardOS 문서 생성기
- 상세 PRD
- 기능명세서
- API 명세서
"""

from __future__ import annotations

import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

# ---------------------------------------------------------------------------
# Paths & fonts
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs"
FONT_PATH = "/System/Library/Fonts/Supplemental/AppleGothic.ttf"
FONT = "AppleGothic"

pdfmetrics.registerFont(TTFont(FONT, FONT_PATH))

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

# Brand colors
C_PRIMARY = colors.HexColor("#1B3A5F")
C_ACCENT = colors.HexColor("#2E75B6")
C_LIGHT = colors.HexColor("#E8F1F8")
C_SOFT = colors.HexColor("#F5F7FA")
C_BORDER = colors.HexColor("#D0D7DE")
C_MUTED = colors.HexColor("#57606A")
C_SUCCESS = colors.HexColor("#1A7F37")
C_WARN = colors.HexColor("#9A6700")
C_DANGER = colors.HexColor("#CF222E")
C_WHITE = colors.white
C_BLACK = colors.HexColor("#1F2328")


# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
def build_styles():
    base = getSampleStyleSheet()
    styles = {}

    styles["cover_title"] = ParagraphStyle(
        "cover_title",
        fontName=FONT,
        fontSize=28,
        leading=36,
        textColor=C_PRIMARY,
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    styles["cover_sub"] = ParagraphStyle(
        "cover_sub",
        fontName=FONT,
        fontSize=14,
        leading=20,
        textColor=C_ACCENT,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    styles["cover_meta"] = ParagraphStyle(
        "cover_meta",
        fontName=FONT,
        fontSize=10,
        leading=15,
        textColor=C_MUTED,
        alignment=TA_CENTER,
    )
    styles["quote"] = ParagraphStyle(
        "quote",
        fontName=FONT,
        fontSize=11,
        leading=17,
        textColor=C_PRIMARY,
        alignment=TA_CENTER,
        leftIndent=20,
        rightIndent=20,
        spaceBefore=16,
        spaceAfter=16,
    )
    styles["h1"] = ParagraphStyle(
        "h1",
        fontName=FONT,
        fontSize=16,
        leading=22,
        textColor=C_PRIMARY,
        spaceBefore=16,
        spaceAfter=8,
        borderPadding=3,
    )
    styles["h2"] = ParagraphStyle(
        "h2",
        fontName=FONT,
        fontSize=13,
        leading=18,
        textColor=C_ACCENT,
        spaceBefore=12,
        spaceAfter=6,
    )
    styles["h3"] = ParagraphStyle(
        "h3",
        fontName=FONT,
        fontSize=11,
        leading=15,
        textColor=C_PRIMARY,
        spaceBefore=8,
        spaceAfter=4,
    )
    styles["body"] = ParagraphStyle(
        "body",
        fontName=FONT,
        fontSize=9.5,
        leading=14.5,
        textColor=C_BLACK,
        alignment=TA_JUSTIFY,
        spaceAfter=4,
    )
    styles["body_left"] = ParagraphStyle(
        "body_left",
        fontName=FONT,
        fontSize=9.5,
        leading=14,
        textColor=C_BLACK,
        alignment=TA_LEFT,
        spaceAfter=3,
    )
    styles["small"] = ParagraphStyle(
        "small",
        fontName=FONT,
        fontSize=8.5,
        leading=12,
        textColor=C_MUTED,
    )
    styles["cell"] = ParagraphStyle(
        "cell",
        fontName=FONT,
        fontSize=8.5,
        leading=12,
        textColor=C_BLACK,
    )
    styles["cell_h"] = ParagraphStyle(
        "cell_h",
        fontName=FONT,
        fontSize=8.5,
        leading=12,
        textColor=C_WHITE,
    )
    styles["bullet"] = ParagraphStyle(
        "bullet",
        fontName=FONT,
        fontSize=9.5,
        leading=14,
        textColor=C_BLACK,
        leftIndent=8,
        spaceAfter=2,
    )
    styles["code"] = ParagraphStyle(
        "code",
        fontName=FONT,
        fontSize=8,
        leading=11.5,
        textColor=C_BLACK,
        backColor=C_SOFT,
        leftIndent=4,
        rightIndent=4,
        spaceBefore=2,
        spaceAfter=2,
    )
    styles["toc"] = ParagraphStyle(
        "toc",
        fontName=FONT,
        fontSize=10,
        leading=16,
        textColor=C_BLACK,
        spaceAfter=2,
    )
    styles["footer"] = ParagraphStyle(
        "footer",
        fontName=FONT,
        fontSize=8,
        leading=10,
        textColor=C_MUTED,
        alignment=TA_CENTER,
    )
    styles["method"] = ParagraphStyle(
        "method",
        fontName=FONT,
        fontSize=9,
        leading=12,
        textColor=C_WHITE,
    )
    styles["endpoint"] = ParagraphStyle(
        "endpoint",
        fontName=FONT,
        fontSize=10,
        leading=14,
        textColor=C_PRIMARY,
        spaceBefore=4,
        spaceAfter=4,
    )
    return styles


S = build_styles()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def P(text: str, style="body"):
    return Paragraph(str(text).replace("\n", "<br/>"), S[style])


def bullets(items, style="bullet"):
    flow = []
    for it in items:
        flow.append(P(f"• {it}", style))
    return flow


def section_title(num: str, title: str):
    return KeepTogether(
        [
            Spacer(1, 4),
            HRFlowable(width="100%", thickness=1.2, color=C_PRIMARY, spaceBefore=2, spaceAfter=4),
            P(f"{num}. {title}", "h1"),
        ]
    )


def subsection(title: str):
    return P(title, "h2")


def h3(title: str):
    return P(title, "h3")


def make_table(headers, rows, col_widths=None, header_bg=C_PRIMARY):
    data = [[P(h, "cell_h") for h in headers]]
    for row in rows:
        data.append([P(c, "cell") if not isinstance(c, Paragraph) else c for c in row])

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), C_WHITE),
        ("FONTNAME", (0, 0), (-1, -1), FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, C_BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_SOFT]),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t


def info_box(title: str, body: str):
    inner = Table(
        [[P(f"<b>{title}</b>", "body_left")], [P(body, "body_left")]],
        colWidths=[PAGE_W - 2 * MARGIN - 8],
    )
    inner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), C_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.8, C_ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return inner


def warn_box(title: str, body: str):
    inner = Table(
        [[P(f"<b>{title}</b>", "body_left")], [P(body, "body_left")]],
        colWidths=[PAGE_W - 2 * MARGIN - 8],
    )
    inner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF8C5")),
                ("BOX", (0, 0), (-1, -1), 0.8, C_WARN),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return inner


def method_badge(method: str, path: str, summary: str):
    color_map = {
        "GET": colors.HexColor("#1A7F37"),
        "POST": colors.HexColor("#0969DA"),
        "PUT": colors.HexColor("#9A6700"),
        "PATCH": colors.HexColor("#8250DF"),
        "DELETE": colors.HexColor("#CF222E"),
    }
    bg = color_map.get(method, C_MUTED)
    badge = Table(
        [[P(f"<b>{method}</b>", "method"), P(f"<b>{path}</b>  —  {summary}", "endpoint")]],
        colWidths=[18 * mm, PAGE_W - 2 * MARGIN - 18 * mm],
    )
    badge.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), bg),
                ("BACKGROUND", (1, 0), (1, 0), C_SOFT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
            ]
        )
    )
    return badge


def add_page_number(canvas, doc, doc_title: str):
    canvas.saveState()
    canvas.setStrokeColor(C_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
    canvas.setFont(FONT, 8)
    canvas.setFillColor(C_MUTED)
    canvas.drawString(MARGIN, 7 * mm, f"OnboardOS | {doc_title}")
    canvas.drawRightString(PAGE_W - MARGIN, 7 * mm, f"{doc.page}")
    # header
    canvas.setStrokeColor(C_PRIMARY)
    canvas.setLineWidth(1.5)
    canvas.line(MARGIN, PAGE_H - 12 * mm, PAGE_W - MARGIN, PAGE_H - 12 * mm)
    canvas.setFont(FONT, 8)
    canvas.setFillColor(C_PRIMARY)
    canvas.drawString(MARGIN, PAGE_H - 10 * mm, "OnboardOS — AI Organizational Operating System")
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 10 * mm, "CONFIDENTIAL | v1.0")
    canvas.restoreState()


def cover_page(story, title, subtitle, version, doc_type, audience):
    story.append(Spacer(1, 35 * mm))
    story.append(P("PRODUCT DOCUMENTATION", "cover_sub"))
    story.append(Spacer(1, 6 * mm))
    story.append(P("OnboardOS", "cover_title"))
    story.append(P("AI Organizational Operating System", "cover_sub"))
    story.append(Spacer(1, 8 * mm))
    story.append(
        HRFlowable(width="60%", thickness=1.5, color=C_ACCENT, spaceBefore=4, spaceAfter=12, hAlign="CENTER")
    )
    story.append(P(title, "cover_title"))
    story.append(P(subtitle, "cover_sub"))
    story.append(Spacer(1, 12 * mm))
    story.append(
        P(
            "“우리는 AI 챗봇을 만든 것이 아니라,<br/>기업의 생산성을 높이는 AI 운영 플랫폼을 만들었습니다.”",
            "quote",
        )
    )
    story.append(Spacer(1, 15 * mm))
    meta = make_table(
        ["항목", "내용"],
        [
            ["문서 유형", doc_type],
            ["버전", version],
            ["기준 문서", "OnboardOS Project Context / PRD v1.0"],
            ["핵심 KPI", "Time To Productivity (TTP)"],
            ["대상 독자", audience],
            ["작성 목적", "해커톤 개발팀·AI 코딩 도구·이해관계자 공통 기준 문서"],
            ["작성일", "2026-07-29"],
        ],
        col_widths=[40 * mm, 110 * mm],
    )
    story.append(meta)
    story.append(PageBreak())


def toc_block(story, items):
    story.append(P("목차", "h1"))
    story.append(HRFlowable(width="100%", thickness=0.8, color=C_ACCENT, spaceAfter=8))
    for i, name in enumerate(items, 1):
        story.append(P(f"{i}. {name}", "toc"))
    story.append(PageBreak())


# ===========================================================================
# 1. 상세 PRD
# ===========================================================================
def build_prd():
    story = []
    cover_page(
        story,
        "상세 제품 요구사항 명세서",
        "Detailed Product Requirements Document",
        "1.0",
        "Product Requirements Document (PRD)",
        "개발팀 / 기획 / AI 코딩 도구 / 이해관계자",
    )
    toc_block(
        story,
        [
            "문서 개요 및 개정 이력",
            "제품 비전·미션·목표",
            "문제 정의 및 시장 맥락",
            "핵심 가치 제안 및 KPI",
            "타겟 고객 및 페르소나",
            "제품 원칙 및 설계 가드레일",
            "제품 범위 (In / Out of Scope)",
            "MVP 정의",
            "사용자 여정 (User Journey)",
            "기능 개요 (Feature Map)",
            "비기능 요구사항",
            "기술 아키텍처 개요",
            "데이터·보안 정책",
            "성공 기준 및 측정",
            "로드맵",
            "리스크 및 가정",
            "용어집",
            "부록",
        ],
    )

    # 1
    story.append(section_title("1", "문서 개요 및 개정 이력"))
    story.append(subsection("1.1 문서 목적"))
    story.append(
        P(
            "본 문서는 OnboardOS의 목표, 범위, 기능·비기능 요구사항, 성공 기준을 상세히 정의한다. "
            "개발팀, AI 코딩 도구(Cursor, Claude Code, Codex, Gemini 등), 이해관계자가 동일한 기준으로 "
            "구현·검토·의사결정 할 수 있도록 하는 것이 목적이다."
        )
    )
    story.append(subsection("1.2 제품 요약"))
    story.append(
        make_table(
            ["항목", "내용"],
            [
                ["제품명", "OnboardOS"],
                ["풀네임", "AI Organizational Operating System"],
                ["카테고리", "Enterprise AI SaaS / 조직 적응 운영 플랫폼"],
                ["핵심 철학", "Reactive AI → Proactive AI"],
                ["핵심 KPI", "Time To Productivity (TTP)"],
                ["Primary 고객", "20~500명 규모 IT 스타트업"],
            ],
            col_widths=[40 * mm, 110 * mm],
        )
    )
    story.append(Spacer(1, 4 * mm))
    story.append(subsection("1.3 개정 이력"))
    story.append(
        make_table(
            ["버전", "일자", "작성", "변경 내용"],
            [
                ["1.0", "2026-07-29", "OnboardOS Team", "최초 상세 PRD 작성 (해커톤 기준)"],
            ],
            col_widths=[20 * mm, 28 * mm, 35 * mm, 67 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("1.4 관련 문서"))
    story.extend(
        bullets(
            [
                "OnboardOS 기능명세서 v1.0 — 기능 단위 상세 정의, 수용 기준",
                "OnboardOS API 명세서 v1.0 — REST API 엔드포인트·스키마·권한",
                "Project Context (원본 제공 문서)",
            ]
        )
    )

    # 2
    story.append(section_title("2", "제품 비전·미션·목표"))
    story.append(subsection("2.1 비전"))
    story.append(
        P(
            "기업의 새로운 구성원이 가장 빠르게 독립적으로 성과를 낼 수 있도록 만드는 "
            "AI Organizational Operating System."
        )
    )
    story.append(subsection("2.2 미션"))
    story.append(
        P(
            "문서를 검색하는 AI가 아니라, 조직 적응 과정 자체를 AI가 설계·운영·분석하는 플랫폼을 제공한다. "
            "신입이 질문하기 전에 오늘 할 일, 만날 사람, 읽을 문서, 체크리스트를 먼저 제시한다."
        )
    )
    story.append(subsection("2.3 핵심 목표 (Priority)"))
    story.append(
        make_table(
            ["순위", "목표", "설명"],
            [
                ["P0", "TTP 단축", "신입이 독립적으로 첫 업무를 완수하는 시간 획기적 단축"],
                ["P0", "온보딩 자동화·개인화", "역할·부서·경력 기반 30일 계획 자동 생성"],
                ["P0", "Enterprise-grade 보안", "RBAC, Workspace Isolation, Audit, Permission-aware RAG"],
                ["P1", "Proactive 경험", "질문 전 AI가 먼저 추천·운영하는 UX"],
            ],
            col_widths=[18 * mm, 45 * mm, 87 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("2.4 성공의 정의"))
    story.append(
        info_box(
            "Success Statement",
            "“우리는 AI 챗봇을 만든 것이 아니라, 기업의 생산성을 높이는 AI 운영 플랫폼을 만들었습니다.” "
            "모든 기능·설계 결정은 이 문장과 TTP 지표로 검증한다.",
        )
    )

    # 3
    story.append(section_title("3", "문제 정의 및 시장 맥락"))
    story.append(subsection("3.1 현재 기업의 온보딩 현실"))
    story.append(
        P(
            "신입에게 Notion, Confluence, Google Drive, Slack, GitHub, Wiki 등 수백 개의 문서를 "
            "한꺼번에 전달한다. 그러나 신입은 다음을 모른다."
        )
    )
    story.extend(
        bullets(
            [
                "무엇부터 읽어야 하는가?",
                "누구에게 질문해야 하는가?",
                "필요한 문서를 어떻게 찾는가?",
                "질문해도 괜찮은가? (심리적 부담)",
            ]
        )
    )
    story.append(
        P(
            "결과: 온보딩 기간 장기화 → 생산성 저하 → 멘토/팀 리소스 소모 → 조직 비용 증가. "
            "특히 성장 중인 스타트업에서는 온보딩 품질 편차가 크고, 문서와 실제 프로세스의 괴리가 크다."
        )
    )
    story.append(subsection("3.2 기존 솔루션의 한계"))
    story.append(
        make_table(
            ["솔루션 유형", "한계"],
            [
                ["ChatGPT / 범용 LLM", "회사 컨텍스트·권한·온보딩 계획 부재, 환각 위험"],
                ["Notion AI / Slack AI / Confluence AI", "Reactive(질문 응답) 중심, “오늘 무엇을 해야 하는가” 미제공"],
                ["단순 RAG 챗봇", "차별성 부족, 조직 적응 운영이 아닌 검색"],
                ["LMS / 교육 플랫폼", "강의·퀴즈 중심, 실제 업무 TTP와 괴리"],
                ["일반 KMS", "저장·검색만 제공, 개인화된 적응 경로 없음"],
            ],
            col_widths=[50 * mm, 100 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("3.3 OnboardOS가 해결하는 본질"))
    story.append(P("AI가 신입이 질문하기 전에 다음을 자동 생성·추천·관리한다."))
    story.extend(
        bullets(
            [
                "오늘 읽어야 할 문서",
                "오늘 만나야 할 사람 (Buddy, 멘토, 팀원)",
                "오늘 완료해야 할 체크리스트",
                "추천 실습 / 과제",
                "개인별 30일 온보딩 계획 (역할·부서·경력·문서 기반)",
            ]
        )
    )

    # 4
    story.append(section_title("4", "핵심 가치 제안 및 KPI"))
    story.append(subsection("4.1 관점 전환"))
    story.append(
        make_table(
            ["기존 관점", "OnboardOS 관점"],
            [
                ["신입이 문서를 잘 읽게 한다", "신입이 독립적으로 업무를 수행할 수 있는 시간을 줄인다"],
                ["교육 도구 / LMS", "기업 생산성 SaaS"],
                ["문서 검색", "조직 적응 운영 시스템"],
                ["질문에 답한다", "질문 전에 행동을 설계한다"],
            ],
            col_widths=[75 * mm, 75 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("4.2 핵심 KPI 정의"))
    story.append(
        make_table(
            ["KPI", "정의", "목표 (MVP 기준)"],
            [
                ["Time To Productivity (TTP)", "신입이 독립적으로 첫 핵심 업무를 완수하는 데 걸리는 시간", "측정 가능 상태로 구현"],
                ["온보딩 계획 준수율", "30일 계획 항목 중 기한 내 완료 비율", "≥ 70% (데모 시나리오)"],
                ["AI 추천 항목 완료율", "‘오늘 할 일’ 추천 중 실제 완료 비율", "≥ 60%"],
                ["문서 접근 권한 위반", "권한 없는 문서 노출/접근 건수", "0건"],
                ["Citation 제공률", "AI 답변 중 출처가 포함된 비율", "100%"],
                ["관리자 온보딩 설정 시간", "Workspace 생성~첫 신입 초대까지 소요 시간", "≤ 15분 (목표)"],
            ],
            col_widths=[42 * mm, 68 * mm, 40 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        warn_box(
            "KPI 원칙",
            "‘온보딩 완료율’만으로 성공을 정의하지 않는다. 핵심은 생산성까지의 시간(TTP)이다. "
            "기능을 추가할 때도 “이 기능이 TTP를 실제로 높이는가?”로 판단한다.",
        )
    )

    # 5
    story.append(section_title("5", "타겟 고객 및 페르소나"))
    story.append(subsection("5.1 타겟 세그먼트"))
    story.append(
        make_table(
            ["구분", "대상", "특징"],
            [
                ["Primary", "20~500명 IT 스타트업", "온보딩 비효율이 성장 병목, 빠른 도입 가능"],
                ["Secondary", "일반 기업, 제조, 병원, 프랜차이즈, 연구실, 학교, 공공", "도메인별 문서·규정 온보딩 수요"],
                ["Enterprise", "대기업 (고보안)", "Dedicated VPC/EC2/DB/VectorDB/RAG Pipeline"],
            ],
            col_widths=[28 * mm, 55 * mm, 67 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("5.2 페르소나"))
    story.append(h3("P1. 신입 사원 (Primary User)"))
    story.extend(
        bullets(
            [
                "목표: 빠르게 적응하고 독립적으로 업무 수행",
                "Pain: 무엇을 해야 할지 모름, 질문 부담, 문서 홍수",
                "기대: “오늘 무엇을 하면 되는지” 명확히 알려주는 AI",
                "주요 화면: 신입 대시보드, 오늘 할 일, 30일 계획, AI Chat, 체크리스트",
            ]
        )
    )
    story.append(h3("P2. 온보딩 담당자 / HR / 팀 리더 (Admin)"))
    story.extend(
        bullets(
            [
                "목표: 온보딩 부담 최소화, 신입 생산성 빠른 향상",
                "Pain: 매번 같은 설명 반복, 문서·권한 관리 어려움",
                "기대: Workspace 생성 → 문서 업로드 → 직원 초대만 하면 AI가 운영",
                "주요 화면: 관리자 대시보드, 문서 관리, 멤버/역할, 온보딩 템플릿, 진행 현황",
            ]
        )
    )
    story.append(h3("P3. 기업 IT / 보안 담당자"))
    story.extend(
        bullets(
            [
                "목표: 데이터 유출 없는 안전한 AI 도입",
                "기대: Workspace Isolation, RBAC, Audit Log, Dedicated Infrastructure",
                "검증 포인트: Permission-aware RAG, LLM 학습 금지(RAG only), AES-256, Zero Trust",
            ]
        )
    )

    # 6
    story.append(section_title("6", "제품 원칙 및 설계 가드레일"))
    story.append(
        make_table(
            ["원칙 ID", "원칙", "설명"],
            [
                ["PR-01", "TTP First", "모든 기능은 TTP 향상에 기여해야 함. 아니면 구현하지 않음"],
                ["PR-02", "Proactive over Reactive", "답변만이 아니라 계획·추천·운영을 먼저 제공"],
                ["PR-03", "Permission before Answer", "RAG 검색 후 반드시 Permission Check, 이후 LLM"],
                ["PR-04", "Citation Always", "모든 AI 응답에 출처 필수. 없으면 답변하지 않거나 제한 고지"],
                ["PR-05", "Workspace Isolation", "회사(Workspace) 간 데이터·벡터·로그 완전 분리"],
                ["PR-06", "No Training on Customer Data", "고객 문서로 LLM을 학습하지 않음. Vector Search + RAG만"],
                ["PR-07", "MVP First", "동작하는 최소 제품 우선, 고급 기능은 Post-MVP"],
                ["PR-08", "Architecture Consistency", "코드 생성 속도보다 아키텍처 일관성 우선"],
            ],
            col_widths=[22 * mm, 42 * mm, 86 * mm],
        )
    )

    # 7
    story.append(section_title("7", "제품 범위 (In / Out of Scope)"))
    story.append(subsection("7.1 In Scope (제품이 하는 일)"))
    story.extend(
        bullets(
            [
                "개인화 30일 온보딩 계획 생성·조회·진행 관리",
                "매일 Proactive “오늘 할 일” 추천",
                "회사 문서 기반 Knowledge Assistant (Citation + Permission)",
                "체크리스트 및 진행률 시각화",
                "관리자 Workspace/문서/멤버/역할/대시보드",
                "문서 파싱 → 청킹 → 임베딩 → 벡터 검색 파이프라인",
                "RBAC, JWT/OAuth2, Audit Log 기반 보안",
            ]
        )
    )
    story.append(subsection("7.2 Out of Scope (절대 만들지 않는 것)"))
    story.append(
        warn_box(
            "금지 형태",
            "단순 RAG 챗봇 · LMS/교육 플랫폼 · 문서 검색 서비스 · 일반적인 지식 관리 시스템. "
            "형태가 위와 같다면 기능이 아무리 많아도 제품 방향과 불일치로 간주한다.",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("7.3 게이트 질문"))
    story.append(
        info_box(
            "Implementation Gate",
            "“이 기능이 신입의 적응 속도(Time To Productivity)를 실제로 높이는가?” "
            "→ Yes: 구현 후보 / No: 구현하지 않음 / Unclear: 측정 방법 정의 후 재평가",
        )
    )

    # 8
    story.append(section_title("8", "MVP 정의"))
    story.append(subsection("8.1 MVP 목표"))
    story.append(
        P(
            "해커톤/초기 데모에서 “관리자가 Workspace를 만들고 문서를 올리면, 신입이 로그인했을 때 "
            "30일 계획과 오늘 할 일을 받고, 권한 검증된 Citation 기반 질답을 할 수 있다”를 end-to-end로 증명한다."
        )
    )
    story.append(subsection("8.2 MVP 포함"))
    story.append(
        make_table(
            ["영역", "포함 기능"],
            [
                ["관리자", "회사/Workspace 생성, 문서 업로드(파싱→청킹→임베딩), 직원 초대 및 역할 부여"],
                ["신입", "대시보드(오늘 할 일+진행률), AI Chat(Citation+Permission), 체크리스트, 30일 계획 보기"],
                ["AI", "RAG+Citation, 개인 온보딩 계획 생성, 오늘 할 일 추천, 권한 검증"],
            ],
            col_widths=[28 * mm, 122 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("8.3 Post-MVP 제외"))
    story.extend(
        bullets(
            [
                "고도화된 암묵지(Organizational Memory) 연결",
                "다중 LLM 라우팅 및 비용 최적화",
                "고급 분석 리포트 / ROI 대시보드",
                "모바일 네이티브 앱",
                "회사별 Dedicated 인프라 완전 자동화",
            ]
        )
    )

    # 9
    story.append(section_title("9", "사용자 여정 (User Journey)"))
    story.append(subsection("9.1 Admin 여정"))
    story.append(
        make_table(
            ["단계", "행동", "시스템 반응"],
            [
                ["1", "회원가입 / 로그인", "JWT 발급, 세션 생성"],
                ["2", "Workspace 생성", "회사 단위 isolation 리소스 초기화"],
                ["3", "문서 업로드", "파싱→청킹→임베딩→VectorDB 저장, 권한 메타 부여"],
                ["4", "역할/템플릿 설정", "역할별 기본 온보딩 템플릿 저장"],
                ["5", "신입 초대", "초대 메일/링크, 역할 부여"],
                ["6", "진행 모니터링", "신입 적응률·병목 요약 대시보드"],
            ],
            col_widths=[18 * mm, 45 * mm, 87 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("9.2 신입 여정"))
    story.append(
        make_table(
            ["단계", "행동", "시스템 반응"],
            [
                ["1", "초대 수락 / 로그인", "Workspace 컨텍스트 바인딩"],
                ["2", "프로필(역할·부서·경력) 확인", "온보딩 계획 생성 트리거"],
                ["3", "대시보드 진입", "오늘 할 일 Proactive 추천 표시"],
                ["4", "문서 읽기 / 체크리스트 완료", "진행률 갱신, 다음 추천 조정"],
                ["5", "AI Chat 질문", "Permission Check → RAG → Citation 답변"],
                ["6", "첫 업무 완수 기록", "TTP 측정 이벤트 기록 (가능 시)"],
            ],
            col_widths=[18 * mm, 50 * mm, 82 * mm],
        )
    )

    # 10
    story.append(section_title("10", "기능 개요 (Feature Map)"))
    story.append(
        P(
            "상세 수용 기준·플로우는 「기능명세서」를 따른다. 본 절은 PRD 관점의 기능 지도이다."
        )
    )
    story.append(
        make_table(
            ["ID", "기능명", "우선순위", "MVP"],
            [
                ["F-01", "AI Onboarding Planner — 개인 30일 계획 생성", "P0", "Y"],
                ["F-02", "AI Recommendation Engine — 오늘 할 일", "P0", "Y"],
                ["F-03", "AI Knowledge Assistant — Chat + Citation + Permission", "P0", "Y"],
                ["F-04", "체크리스트 관리", "P0", "Y"],
                ["F-05", "신입 대시보드 (진행률 시각화)", "P0", "Y"],
                ["F-06", "Workspace / 회사 관리", "P0", "Y"],
                ["F-07", "문서 업로드 및 임베딩 파이프라인", "P0", "Y"],
                ["F-08", "멤버 초대 및 RBAC 역할 부여", "P0", "Y"],
                ["F-09", "AI Progress Analyzer", "P1", "Partial"],
                ["F-10", "온보딩 템플릿 관리", "P1", "Partial"],
                ["F-11", "AI Organizational Memory (암묵지)", "P2", "N"],
                ["F-12", "Audit Log 조회", "P1", "Y(기본)"],
            ],
            col_widths=[18 * mm, 78 * mm, 28 * mm, 26 * mm],
        )
    )

    # 11
    story.append(section_title("11", "비기능 요구사항"))
    story.append(subsection("11.1 보안 (최우선)"))
    story.extend(
        bullets(
            [
                "RBAC (Role-Based Access Control): ADMIN, HR, MANAGER, MEMBER, INTERN 등",
                "인증: JWT + OAuth2",
                "저장 데이터 AES-256 암호화 (민감 필드/시크릿)",
                "Audit Log: 모든 AI 접근·문서 조회·권한 거부 기록",
                "Workspace Isolation: 테넌트 간 데이터/인덱스 분리",
                "Zero Trust: 요청마다 인증·인가 검증",
                "AI도 사람의 문서 권한을 그대로 따름 (예: Intern → 연봉표 거부)",
                "LLM이 기업 문서를 학습하지 않음 (Vector Search + RAG only)",
            ]
        )
    )
    story.append(subsection("11.2 신뢰성·성능·운영 (MVP 목표치)"))
    story.append(
        make_table(
            ["항목", "요구사항"],
            [
                ["가용성", "데모/해커톤 환경에서 핵심 플로우 중단 없음"],
                ["Chat 응답", "권한 검증 포함 end-to-end 목표 p95 ≤ 8s (모델·네트워크 의존)"],
                ["문서 임베딩", "비동기 처리, 상태(PENDING/PROCESSING/READY/FAILED) 노출"],
                ["API 문서화", "모든 API Swagger/OpenAPI"],
                ["로깅", "구조화 로그 + 요청 correlation id"],
                ["확장성", "멀티 Workspace SaaS로 확장 가능한 모듈 경계"],
            ],
            col_widths=[35 * mm, 115 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("11.3 기타"))
    story.extend(
        bullets(
            [
                "모든 AI 응답에 Citation 필수",
                "확장 가능한 Enterprise SaaS 아키텍처",
                "Frontend → Backend → AI → 테스트 순으로 기능 완성",
            ]
        )
    )

    # 12
    story.append(section_title("12", "기술 아키텍처 개요"))
    story.append(subsection("12.1 스택"))
    story.append(
        make_table(
            ["영역", "기술"],
            [
                ["Frontend", "Next.js + React + TypeScript + Tailwind + shadcn/ui"],
                ["Backend", "Spring Boot + Java + Spring Security + OAuth2 + JWT"],
                ["AI", "LangChain4j / OpenAI API(기본) / Claude·Gemini(선택)"],
                ["Database", "PostgreSQL + pgvector"],
                ["Storage", "Supabase Storage"],
                ["Infra", "Docker + Docker Compose + GitHub Actions + Nginx"],
                ["Cloud", "AWS (EC2, VPC, IAM, Security Group) / Enterprise 전용 인프라"],
            ],
            col_widths=[30 * mm, 120 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("12.2 데이터 흐름 (Knowledge)"))
    story.append(
        info_box(
            "Pipeline",
            "Upload → Parsing → Chunk → Embedding → VectorDB → Retrieval → "
            "Permission Check → LLM → Citation → Response",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("12.3 Enterprise Dedicated 구조"))
    story.append(
        P("Company → Dedicated VPC → Dedicated EC2 → Dedicated PostgreSQL → Dedicated VectorDB(pgvector) → Dedicated RAG Pipeline")
    )

    # 13
    story.append(section_title("13", "데이터·보안 정책"))
    story.extend(
        bullets(
            [
                "문서·청크·임베딩·채팅 로그는 workspace_id로 강제 분리한다.",
                "검색 단계에서 role/document ACL을 적용하지 않은 raw top-k를 LLM 컨텍스트에 넣지 않는다.",
                "권한 거부 시 문서 존재 여부까지 과도하게 노출하지 않도록 응답 메시지를 표준화한다.",
                "API 키·토큰은 서버 사이드만 보관하며 클라이언트에 노출하지 않는다.",
                "개인정보(이메일 등)는 최소 수집·목적 한정 사용 원칙을 따른다.",
            ]
        )
    )

    # 14
    story.append(section_title("14", "성공 기준 및 측정"))
    story.append(
        make_table(
            ["구분", "성공 기준"],
            [
                ["데모", "Admin 설정 → 신입 오늘 할 일/30일 계획/Chat(Citation) E2E 시연 가능"],
                ["보안", "권한 없는 문서 질문 시 거부 + Audit 기록"],
                ["차별성", "단순 챗봇이 아닌 Planner + Daily Recommendation이 핵심 UX"],
                ["문서화", "PRD / 기능명세 / API 명세 / Swagger 정합"],
                ["코드", "FE·BE·AI 모듈 경계 명확, Docker로 기동 가능"],
            ],
            col_widths=[30 * mm, 120 * mm],
        )
    )

    # 15
    story.append(section_title("15", "로드맵"))
    story.append(
        make_table(
            ["Phase", "내용"],
            [
                ["MVP (Phase 1)", "Workspace, 문서 파이프라인, 30일 계획, 오늘 할 일, Chat+Citation+Permission, 체크리스트, 대시보드"],
                ["Phase 2", "AI Progress Analyzer 고도화 + 관리자 인사이트"],
                ["Phase 3", "Organizational Memory (암묵지) 강화"],
                ["Phase 4", "Multi-LLM 라우팅 및 비용 최적화"],
                ["Phase 5", "Enterprise Dedicated 인프라 완전 자동화"],
                ["Phase 6", "TTP 측정 대시보드 및 ROI 리포트"],
            ],
            col_widths=[35 * mm, 115 * mm],
        )
    )

    # 16
    story.append(section_title("16", "리스크 및 가정"))
    story.append(
        make_table(
            ["리스크", "영향", "대응"],
            [
                ["LLM 환각", "잘못된 온보딩 지시", "Citation 강제, 근거 없는 단정 금지 프롬프트"],
                ["권한 누수", "민감 문서 노출", "Retrieval 후 Permission Filter, 테스트 케이스 필수"],
                ["임베딩 지연", "문서 업로드 후 즉시 검색 실패", "비동기 상태 표시, READY 전 안내"],
                ["범위 팽창", "해커톤 내 미완성", "TTP 게이트로 기능 거절, MVP 고정"],
                ["API 비용", "데모 중 과금", "캐시, 짧은 컨텍스트, 모델 티어 분리"],
            ],
            col_widths=[35 * mm, 45 * mm, 70 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("16.1 가정"))
    story.extend(
        bullets(
            [
                "MVP에서는 단일 리전, 단일 배포 단위로 Workspace logical isolation을 우선 구현한다.",
                "문서 형식은 PDF/Markdown/TXT/DOCX 중심으로 시작한다.",
                "OpenAI API를 기본 LLM·임베딩 제공자로 사용한다 (교체 가능한 인터페이스 유지).",
            ]
        )
    )

    # 17
    story.append(section_title("17", "용어집"))
    story.append(
        make_table(
            ["용어", "정의"],
            [
                ["TTP", "Time To Productivity. 독립적으로 첫 업무를 완수하는 데 걸리는 시간"],
                ["Workspace", "회사/조직 단위 테넌트. 데이터 isolation의 기본 경계"],
                ["Proactive AI", "사용자 질문 전에 계획·추천을 먼저 제시하는 AI"],
                ["Reactive AI", "질문에 답하는 형태의 AI (챗봇)"],
                ["Citation", "AI 답변의 근거가 된 문서/청크 출처"],
                ["Permission Check", "검색된 문서에 대해 사용자 접근 권한을 검증하는 단계"],
                ["RAG", "Retrieval-Augmented Generation. 검색 증강 생성"],
                ["Chunk", "임베딩·검색 단위로 나눈 문서 조각"],
                ["RBAC", "역할 기반 접근 제어"],
                ["Organizational Memory", "암묵지·사람 연결 지식 맵 (Post-MVP)"],
            ],
            col_widths=[40 * mm, 110 * mm],
        )
    )

    # 18
    story.append(section_title("18", "부록"))
    story.append(subsection("18.1 개발 원칙 (바이브 코딩)"))
    story.extend(
        bullets(
            [
                "작은 단위(1기능 = 1프롬프트)로 구현 요청",
                "Frontend → Backend → AI → 테스트 순으로 완성",
                "먼저 동작하는 MVP, 이후 UI/고급 기능",
                "모든 API는 Swagger/OpenAPI 문서화",
                "모든 AI 응답에 Citation + 권한 검증 포함",
                "코드 생성보다 아키텍처 일관성 우선",
                "확장 가능한 Enterprise SaaS를 목표로 설계",
            ]
        )
    )
    story.append(subsection("18.2 한 문장 기준"))
    story.append(
        info_box(
            "Why OnboardOS exists",
            "우리는 챗봇을 만들지 않는다. 문서 검색기를 만들지 않는다. LMS를 만들지 않는다. "
            "우리는 신입이 독립적으로 성과를 내는 데 걸리는 시간(TTP)을 줄이는 AI Organizational Operating System을 만든다.",
        )
    )

    return story


# ===========================================================================
# 2. 기능명세서
# ===========================================================================
def feature_block(story, fid, name, priority, mvp, summary, actors, pre, main_flow, alt_flow, biz_rules, ac, ui, apis):
    story.append(KeepTogether([
        HRFlowable(width="100%", thickness=0.8, color=C_ACCENT, spaceBefore=8, spaceAfter=4),
        P(f"{fid}. {name}", "h2"),
    ]))
    story.append(
        make_table(
            ["항목", "내용"],
            [
                ["기능 ID", fid],
                ["기능명", name],
                ["우선순위", priority],
                ["MVP 포함", mvp],
                ["요약", summary],
                ["주요 액터", actors],
            ],
            col_widths=[32 * mm, 118 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(h3("사전 조건"))
    story.extend(bullets(pre))
    story.append(h3("기본 흐름"))
    for i, step in enumerate(main_flow, 1):
        story.append(P(f"{i}. {step}", "bullet"))
    if alt_flow:
        story.append(h3("대안/예외 흐름"))
        story.extend(bullets(alt_flow))
    story.append(h3("비즈니스 규칙"))
    story.extend(bullets(biz_rules))
    story.append(h3("수용 기준 (Acceptance Criteria)"))
    story.extend(bullets(ac))
    story.append(h3("UI 요구사항"))
    story.extend(bullets(ui))
    story.append(h3("관련 API"))
    story.extend(bullets(apis))


def build_feature_spec():
    story = []
    cover_page(
        story,
        "기능명세서",
        "Feature Specification Document",
        "1.0",
        "Functional Specification",
        "개발팀 / QA / AI 코딩 도구 / 기획",
    )
    toc_block(
        story,
        [
            "문서 개요",
            "공통 규칙 및 역할 정의",
            "기능 목록 총괄",
            "F-01 AI Onboarding Planner",
            "F-02 AI Recommendation Engine",
            "F-03 AI Knowledge Assistant",
            "F-04 체크리스트 관리",
            "F-05 신입 대시보드",
            "F-06 Workspace 관리",
            "F-07 문서 업로드·임베딩 파이프라인",
            "F-08 멤버 초대 및 RBAC",
            "F-09 AI Progress Analyzer",
            "F-10 온보딩 템플릿 관리",
            "F-11 Organizational Memory (Post-MVP)",
            "F-12 Audit Log",
            "F-13 인증·세션",
            "비기능·권한 매트릭스",
            "화면 목록",
            "테스트 시나리오 요약",
        ],
    )

    story.append(section_title("1", "문서 개요"))
    story.append(
        P(
            "본 기능명세서는 OnboardOS의 기능을 구현 가능한 수준으로 상세화한다. "
            "각 기능은 ID, 액터, 사전조건, 기본/예외 흐름, 비즈니스 규칙, 수용 기준, UI, 관련 API를 포함한다. "
            "상위 문서는 「상세 PRD」, 하위 연동 명세는 「API 명세서」이다."
        )
    )
    story.append(
        make_table(
            ["항목", "내용"],
            [
                ["제품", "OnboardOS"],
                ["버전", "1.0"],
                ["기준 KPI", "Time To Productivity (TTP)"],
                ["범위", "MVP + Partial P1 (Analyzer/Template 기본)"],
            ],
            col_widths=[40 * mm, 110 * mm],
        )
    )

    story.append(section_title("2", "공통 규칙 및 역할 정의"))
    story.append(subsection("2.1 역할 (RBAC)"))
    story.append(
        make_table(
            ["Role", "설명", "주요 권한"],
            [
                ["OWNER", "Workspace 소유자", "모든 관리 권한, 빌링/삭제(향후)"],
                ["ADMIN", "관리자/HR", "문서·멤버·템플릿·대시보드 관리"],
                ["MANAGER", "팀 리더", "팀 신입 진행 조회, 일부 템플릿"],
                ["MEMBER", "일반 구성원", "허용 문서 조회, 멘토로 지정 가능"],
                ["INTERN / NEW_HIRE", "신입", "본인 계획·체크리스트·Chat"],
            ],
            col_widths=[32 * mm, 40 * mm, 78 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("2.2 공통 비즈니스 규칙"))
    story.extend(
        bullets(
            [
                "모든 요청은 인증된 사용자 + workspace 컨텍스트를 가진다.",
                "다른 workspace 리소스 ID를 직접 추측·접근해도 404 또는 403으로 차단한다.",
                "AI 기능은 항상 workspace 문서 범위 안에서만 동작한다.",
                "Permission Check 실패 문서는 LLM 컨텍스트에 포함하지 않는다.",
                "AI 응답 메시지에는 citations[] 배열이 포함되어야 한다 (근거 없을 때 명시적 empty + 고지).",
            ]
        )
    )

    story.append(section_title("3", "기능 목록 총괄"))
    story.append(
        make_table(
            ["ID", "기능", "P", "MVP"],
            [
                ["F-01", "AI Onboarding Planner", "P0", "Y"],
                ["F-02", "AI Recommendation Engine", "P0", "Y"],
                ["F-03", "AI Knowledge Assistant", "P0", "Y"],
                ["F-04", "체크리스트 관리", "P0", "Y"],
                ["F-05", "신입 대시보드", "P0", "Y"],
                ["F-06", "Workspace 관리", "P0", "Y"],
                ["F-07", "문서 업로드·임베딩", "P0", "Y"],
                ["F-08", "멤버 초대 및 RBAC", "P0", "Y"],
                ["F-09", "AI Progress Analyzer", "P1", "Partial"],
                ["F-10", "온보딩 템플릿", "P1", "Partial"],
                ["F-11", "Organizational Memory", "P2", "N"],
                ["F-12", "Audit Log", "P1", "Y"],
                ["F-13", "인증·세션", "P0", "Y"],
            ],
            col_widths=[20 * mm, 70 * mm, 25 * mm, 35 * mm],
        )
    )

    # Features
    story.append(section_title("4", "기능 상세"))

    feature_block(
        story,
        "F-01",
        "AI Onboarding Planner (개인 30일 온보딩 계획)",
        "P0",
        "Yes",
        "역할·부서·경력 수준·회사 문서를 기반으로 신입 개인별 30일 온보딩 계획을 자동 생성한다. 제품의 가장 핵심 기능.",
        "NEW_HIRE, ADMIN, SYSTEM(AI)",
        [
            "신입이 Workspace에 소속되어 있다",
            "역할(Role), 부서, 경력 수준 정보가 존재한다",
            "최소 1개 이상의 READY 상태 문서가 있다 (없어도 기본 템플릿 기반 생성 가능)",
        ],
        [
            "시스템 또는 Admin이 계획 생성을 요청한다 (초대 수락/프로필 완료 시 자동 트리거 가능)",
            "Planner가 사용자 메타 + 문서 카탈로그 + (선택) 템플릿을 입력으로 계획을 생성한다",
            "일별/주별 항목으로 문서 읽기, 만날 사람, 체크리스트, 실습, 학습 순서를 구성한다",
            "계획을 저장하고 신입 대시보드에 노출한다",
            "Admin은 필요 시 항목을 수정·재생성할 수 있다 (MVP: 조회+재생성 우선)",
        ],
        [
            "문서가 전혀 없으면 일반 온보딩 골격 + “문서 업로드 필요” 안내 항목 포함",
            "LLM 실패 시 템플릿 기반 fallback 계획 생성",
            "이미 계획이 있으면 재생성 확인 후 버전 갱신",
        ],
        [
            "계획은 반드시 user_id + workspace_id 스코프",
            "학습 순서는 선행 지식을 고려한 순서 필드를 가진다",
            "각 항목은 type(DOCUMENT|PERSON|CHECKLIST|PRACTICE), day_index(1~30), status를 가진다",
            "문서 항목은 document_id 참조 가능 시 연결",
        ],
        [
            "Given 신입 프로필과 문서가 있을 때 When 계획 생성 Then 1~30일 항목이 저장·조회된다",
            "계획에 문서/사람/체크리스트/실습 유형이 최소 1개 이상 포함된다",
            "권한 없는 문서는 계획 항목에 포함되지 않는다",
            "신입은 본인 계획만 조회 가능하다",
        ],
        [
            "30일 타임라인 또는 주간 탭 UI",
            "일차별 카드: 제목, 유형, 예상 시간, 완료 여부",
            "재생성을 위한 Admin 액션 (권한 있을 때)",
        ],
        [
            "POST /api/v1/onboarding-plans/generate",
            "GET /api/v1/onboarding-plans/me",
            "GET /api/v1/onboarding-plans/{planId}",
            "POST /api/v1/onboarding-plans/{planId}/regenerate",
        ],
    )

    feature_block(
        story,
        "F-02",
        "AI Recommendation Engine (오늘 할 일)",
        "P0",
        "Yes",
        "매일 신입 대시보드 접속 시 ‘오늘 해야 할 일’을 Proactive하게 추천한다.",
        "NEW_HIRE, SYSTEM(AI)",
        [
            "유효한 온보딩 계획이 있거나, 없어도 기본 추천 생성 가능",
            "사용자 오늘 날짜·진행 상태가 존재",
        ],
        [
            "신입이 대시보드에 진입한다",
            "시스템이 계획 day_index, 미완료 항목, 최근 진행, 문서 상태를 조합한다",
            "오늘 읽을 문서 / 만날 사람 / 체크리스트 / 실습을 추천 리스트로 반환한다",
            "UI에 자동 표시한다 (질문 불필요)",
        ],
        [
            "계획 미생성 시: 프로필 완성·계획 생성 CTA 추천",
            "모든 오늘 항목 완료 시: 다음 일차 선학습 또는 복습 추천",
        ],
        [
            "추천은 최대 N개(기본 5~10)로 제한",
            "이미 완료된 항목은 제외하거나 ‘완료’ 상태로 표시",
            "문서 권한 없는 항목 제외",
        ],
        [
            "대시보드 진입만으로 오늘 할 일이 표시된다",
            "추천 항목 완료 시 목록/진행률이 갱신된다",
            "날짜 변경 시 해당 일자 기준 추천이 바뀐다",
        ],
        [
            "‘오늘 할 일’ 섹션 최상단 고정",
            "유형별 아이콘, 완료 체크, 상세 링크",
        ],
        [
            "GET /api/v1/recommendations/today",
            "POST /api/v1/recommendations/{id}/complete",
        ],
    )

    feature_block(
        story,
        "F-03",
        "AI Knowledge Assistant (Chat + Citation + Permission)",
        "P0",
        "Yes",
        "회사 문서 기반 질의응답. 답변 전 Permission Check, 답변 시 Citation 필수.",
        "NEW_HIRE, MEMBER, MANAGER, ADMIN",
        [
            "로그인 및 workspace 소속",
            "질문이 비어 있지 않음",
        ],
        [
            "사용자가 질문을 전송한다",
            "쿼리 임베딩 후 VectorDB top-k 검색 (workspace 필터)",
            "각 후보 청크에 대해 Permission Check 수행, 거부 청크 제거",
            "허용 컨텍스트로 LLM 답변 생성",
            "citations(문서 제목, 청크, 위치/페이지 가능 시) 포함 응답",
            "Audit Log 기록 (질문, 사용 문서 ID, 거부 여부)",
        ],
        [
            "허용 컨텍스트 0건: “접근 가능한 근거 문서가 없습니다” 표준 응답 + empty citations",
            "LLM 오류: 503/재시도 안내",
            "민감 키워드라도 권한 없으면 내용 미노출",
        ],
        [
            "Permission Check 없는 검색 결과 직접 반환 금지",
            "Citation 없는 단정적 사내 정보 답변 금지 정책",
            "Intern이 연봉표 등 고권한 문서 질문 시 거부",
            "대화 히스토리는 workspace+user 단위 저장",
        ],
        [
            "정상 질문 시 answer + citations[] 반환",
            "권한 없는 문서만 매칭되면 내용 미포함 거부 메시지",
            "모든 호출이 audit에 남는다",
            "다른 workspace 문서를 절대 참조하지 않는다",
        ],
        [
            "채팅 UI, 메시지 버블, citation 칩/링크",
            "로딩 상태, 에러 토스트",
        ],
        [
            "POST /api/v1/chat/messages",
            "GET /api/v1/chat/sessions",
            "GET /api/v1/chat/sessions/{sessionId}",
        ],
    )

    feature_block(
        story,
        "F-04",
        "체크리스트 관리",
        "P0",
        "Yes",
        "온보딩 계획에서 파생되거나 수동 생성된 체크리스트를 조회·완료·해제한다.",
        "NEW_HIRE, ADMIN",
        ["사용자에게 할당된 체크리스트가 존재"],
        [
            "체크리스트 목록 조회",
            "항목 완료 토글",
            "진행률 재계산 (대시보드 반영)",
        ],
        ["이미 완료된 항목 재완료 시 idempotent 처리"],
        [
            "본인 체크리스트만 수정 가능 (Admin은 조회 가능)",
            "완료 시각 completed_at 기록",
        ],
        [
            "완료 토글 시 상태가 즉시 반영된다",
            "전체 완료율 %가 올바르게 계산된다",
        ],
        ["체크박스 리스트, 진행 바, 필터(전체/미완/완료)"],
        [
            "GET /api/v1/checklists/me",
            "PATCH /api/v1/checklists/items/{itemId}",
        ],
    )

    feature_block(
        story,
        "F-05",
        "신입 대시보드",
        "P0",
        "Yes",
        "오늘 할 일, 30일 계획 요약, 체크리스트, 진행률, AI Chat 진입점을 한 화면에서 제공한다.",
        "NEW_HIRE",
        ["로그인된 신입 사용자"],
        [
            "대시보드 진입",
            "오늘 할 일 / 진행률 / 계획 요약 / 최근 chat 진입 CTA 로드",
        ],
        ["계획 미생성 시 온보딩 시작 CTA 표시"],
        ["초기 로딩 성능: 병렬 API 호출 권장", "빈 상태(Empty state) UX 필수"],
        [
            "필수 위젯이 모두 렌더링된다",
            "진행률은 체크리스트·계획 완료 항목 기반",
        ],
        [
            "반응형 웹 (Desktop first, 태블릿 가능)",
            "shadcn/ui 카드·차트 컴포넌트",
        ],
        [
            "GET /api/v1/dashboard/me",
            "(내부적으로 recommendations, plan summary, progress 조합 가능)",
        ],
    )

    feature_block(
        story,
        "F-06",
        "Workspace(회사) 관리",
        "P0",
        "Yes",
        "회사 단위 Workspace 생성 및 기본 설정 관리.",
        "OWNER, ADMIN",
        ["인증된 사용자"],
        [
            "Workspace 이름·슬러그 입력",
            "생성 시 기본 역할·스토리지 prefix·벡터 네임스페이스 초기화",
            "설정 조회/수정 (이름, 로고 URL 등 기본 필드)",
        ],
        ["슬러그 중복 시 409", "권한 없는 사용자 생성 정책: MVP는 로그인 사용자 생성 허용 후 OWNER 부여"],
        [
            "workspace_id가 모든 하위 리소스의 필수 FK",
            "삭제(하드)는 MVP 비활성 또는 soft delete",
        ],
        [
            "생성 후 현재 사용자 context에 workspace가 설정된다",
            "다른 workspace 데이터 미노출",
        ],
        ["생성 폼, 설정 페이지"],
        [
            "POST /api/v1/workspaces",
            "GET /api/v1/workspaces/me",
            "PATCH /api/v1/workspaces/{workspaceId}",
        ],
    )

    feature_block(
        story,
        "F-07",
        "문서 업로드 및 임베딩 파이프라인",
        "P0",
        "Yes",
        "문서 업로드 후 자동 파싱→청킹→임베딩→VectorDB 저장. 상태 추적 가능.",
        "ADMIN, MANAGER",
        ["Workspace 존재", "업로드 권한"],
        [
            "파일 업로드 (Storage)",
            "Document 레코드 생성 (status=PENDING)",
            "비동기 워커: parse → chunk → embed → upsert vectors",
            "status=READY 또는 FAILED",
            "목록/상세에서 상태 확인",
        ],
        [
            "지원하지 않는 포맷: 400",
            "파싱 실패: FAILED + error_message",
            "재처리 API로 재시도 가능",
        ],
        [
            "청크 메타: document_id, workspace_id, chunk_index, required_roles/acl",
            "기본 ACL: 업로더가 지정, 미지정 시 workspace MEMBER 이상 또는 전체(설정)",
            "최대 파일 크기·확장자 화이트리스트 적용",
        ],
        [
            "업로드 후 상태가 PENDING→PROCESSING→READY로 전이된다",
            "READY 문서는 Chat 검색에 포함된다",
            "FAILED 시 관리자가 원인을 볼 수 있다",
        ],
        [
            "드래그앤드롭 업로드",
            "상태 뱃지, 재처리 버튼",
        ],
        [
            "POST /api/v1/documents",
            "GET /api/v1/documents",
            "GET /api/v1/documents/{documentId}",
            "POST /api/v1/documents/{documentId}/reprocess",
            "DELETE /api/v1/documents/{documentId}",
        ],
    )

    feature_block(
        story,
        "F-08",
        "멤버 초대 및 RBAC 역할 부여",
        "P0",
        "Yes",
        "이메일 초대로 멤버를 추가하고 역할을 부여·변경한다.",
        "ADMIN, OWNER",
        ["Workspace 관리 권한"],
        [
            "이메일·역할 입력 후 초대 생성",
            "초대 토큰/링크 발급 (MVP: 콘솔 표시 또는 메일 스텁)",
            "피초대자 수락 시 멤버십 활성화",
            "역할 변경 / 비활성화",
        ],
        ["이미 멤버인 이메일: 409", "만료된 초대: 410 또는 재초대"],
        [
            "역할 변경은 Admin 이상",
            "자기 자신 OWNER 제거 방지 규칙",
            "신입 역할 부여 시 계획 생성 트리거 가능",
        ],
        [
            "초대 수락 후 workspace 접근 가능",
            "역할에 따라 API 403이 올바르게 동작",
        ],
        ["멤버 테이블, 초대 모달, 역할 셀렉트"],
        [
            "POST /api/v1/members/invitations",
            "POST /api/v1/members/invitations/{token}/accept",
            "GET /api/v1/members",
            "PATCH /api/v1/members/{memberId}",
        ],
    )

    feature_block(
        story,
        "F-09",
        "AI Progress Analyzer",
        "P1",
        "Partial (MVP: 진행률 요약)",
        "계획 대비 진행률, 병목, 추천 조정을 분석하고 관리자에게 요약을 제공한다.",
        "ADMIN, MANAGER, SYSTEM",
        ["신입 계획 및 활동 데이터 존재"],
        [
            "진행률 계산 (완료 항목 / 전체)",
            "지연 항목·미착수 일차 식별",
            "Admin 요약 카드 제공",
            "(Post-MVP) LLM 인사이트 문장 생성",
        ],
        ["데이터 부족 시 기본 통계만 제공"],
        ["개인 민감 대화 전문은 Admin 기본 비공개 (정책 설정 가능)"],
        [
            "진행률 %가 체크리스트/계획과 일치",
            "Admin이 신입별 요약을 볼 수 있다",
        ],
        ["진행 바, 병목 리스트, 신입 테이블"],
        [
            "GET /api/v1/progress/me",
            "GET /api/v1/admin/progress",
            "GET /api/v1/admin/progress/{userId}",
        ],
    )

    feature_block(
        story,
        "F-10",
        "온보딩 템플릿 관리",
        "P1",
        "Partial",
        "역할별 기본 온보딩 템플릿을 저장하고 Planner 입력으로 사용한다.",
        "ADMIN",
        ["Admin 권한"],
        [
            "템플릿 생성(역할, 일차 골격, 기본 체크리스트)",
            "목록/수정",
            "계획 생성 시 템플릿 참조",
        ],
        ["템플릿 삭제 시 기존 계획에 영향 없음 (스냅샷)"],
        ["템플릿은 workspace 스코프"],
        ["역할별 템플릿 적용이 계획 생성에 반영된다"],
        ["템플릿 에디터 (MVP: 간단 폼)"],
        [
            "GET /api/v1/templates",
            "POST /api/v1/templates",
            "PATCH /api/v1/templates/{templateId}",
        ],
    )

    feature_block(
        story,
        "F-11",
        "AI Organizational Memory (암묵지)",
        "P2",
        "No (Post-MVP)",
        "“이 문제는 보통 누구에게 물어보나요?” 수준의 암묵지·사람 연결 맵.",
        "ALL, SYSTEM",
        ["조직 활동 데이터 축적"],
        ["사람-토픽 매핑 구축", "Chat/추천에 멘토 추천 반영"],
        ["데이터 부족 시 비활성"],
        ["개인 평가 용도 남용 방지 정책 필요"],
        ["Post-MVP — 구현하지 않음"],
        ["N/A"],
        ["N/A (향후)"],
    )

    feature_block(
        story,
        "F-12",
        "Audit Log",
        "P1",
        "Yes (기본 기록 + Admin 조회)",
        "AI 접근, 문서 접근, 권한 거부, 관리 액션을 감사 로그로 남긴다.",
        "SYSTEM, ADMIN",
        ["이벤트 발생"],
        [
            "이벤트 타입·actor·resource·result·timestamp 기록",
            "Admin 필터 조회",
        ],
        ["일반 멤버는 조회 불가"],
        ["로그 변조 방지(append-only)", "workspace 스코프"],
        [
            "권한 거부 Chat이 로그에 남는다",
            "Admin만 조회 API 성공",
        ],
        ["로그 테이블, 필터"],
        [
            "GET /api/v1/admin/audit-logs",
        ],
    )

    feature_block(
        story,
        "F-13",
        "인증·세션",
        "P0",
        "Yes",
        "회원가입/로그인, JWT 발급, OAuth2 확장 포인트, 내 정보 조회.",
        "ALL",
        ["유효한 자격 증명"],
        [
            "이메일 회원가입 또는 로그인",
            "Access Token(JWT) 발급",
            "Authorization Bearer로 API 호출",
            "내 프로필/역할/workspace 목록 조회",
        ],
        ["잘못된 비밀번호 401", "만료 토큰 401"],
        [
            "비밀번호 해시 저장",
            "토큰에 workspace 전환 클레임 또는 헤더 X-Workspace-Id 병행",
        ],
        [
            "로그인 후 보호 API 접근 가능",
            "토큰 없이 401",
        ],
        ["로그인/회원가입 페이지"],
        [
            "POST /api/v1/auth/signup",
            "POST /api/v1/auth/login",
            "GET /api/v1/auth/me",
            "POST /api/v1/auth/logout",
        ],
    )

    story.append(section_title("5", "권한 매트릭스 (요약)"))
    story.append(
        make_table(
            ["리소스/액션", "OWNER", "ADMIN", "MANAGER", "MEMBER", "NEW_HIRE"],
            [
                ["Workspace 설정", "RW", "RW", "R", "-", "-"],
                ["문서 업로드", "RW", "RW", "RW", "R*", "R*"],
                ["멤버 초대/역할", "RW", "RW", "R", "-", "-"],
                ["계획 생성/재생성", "RW", "RW", "R", "-", "R(본인)"],
                ["오늘 할 일", "R", "R", "R", "R", "RW(본인)"],
                ["Chat", "RW", "RW", "RW", "RW", "RW"],
                ["Admin 진행 현황", "R", "R", "R(팀)", "-", "-"],
                ["Audit Log", "R", "R", "-", "-", "-"],
            ],
            col_widths=[38 * mm, 22 * mm, 22 * mm, 24 * mm, 22 * mm, 22 * mm],
        )
    )
    story.append(P("* 문서 읽기는 ACL/역할에 따름", "small"))

    story.append(section_title("6", "화면 목록"))
    story.append(
        make_table(
            ["화면 ID", "이름", "주요 사용자"],
            [
                ["S-01", "로그인 / 회원가입", "ALL"],
                ["S-02", "Workspace 생성/선택", "ADMIN/OWNER"],
                ["S-03", "신입 대시보드", "NEW_HIRE"],
                ["S-04", "30일 온보딩 계획", "NEW_HIRE"],
                ["S-05", "체크리스트", "NEW_HIRE"],
                ["S-06", "AI Chat", "ALL(권한 내)"],
                ["S-07", "관리자 대시보드", "ADMIN"],
                ["S-08", "문서 관리", "ADMIN"],
                ["S-09", "멤버/초대 관리", "ADMIN"],
                ["S-10", "템플릿 관리", "ADMIN"],
                ["S-11", "Audit Log", "ADMIN"],
            ],
            col_widths=[25 * mm, 70 * mm, 55 * mm],
        )
    )

    story.append(section_title("7", "테스트 시나리오 요약"))
    story.append(
        make_table(
            ["ID", "시나리오", "기대 결과"],
            [
                ["T-01", "Admin Workspace 생성→문서 업로드→READY", "검색/계획에 사용 가능"],
                ["T-02", "신입 초대→계획 자동 생성", "30일 항목 조회"],
                ["T-03", "대시보드 오늘 할 일 표시", "질문 없이 추천 노출"],
                ["T-04", "허용 문서 질문", "answer + citations"],
                ["T-05", "Intern 연봉표 질문", "거부 + audit"],
                ["T-06", "체크리스트 완료", "진행률 증가"],
                ["T-07", "타 Workspace ID 직접 호출", "403/404"],
            ],
            col_widths=[18 * mm, 70 * mm, 62 * mm],
        )
    )

    return story


# ===========================================================================
# 3. API 명세서
# ===========================================================================
def api_endpoint(story, method, path, summary, auth, roles, desc, req_headers, path_params, query_params, req_body, res_body, errors):
    story.append(Spacer(1, 3 * mm))
    story.append(method_badge(method, path, summary))
    story.append(P(desc, "body_left"))
    story.append(
        make_table(
            ["항목", "내용"],
            [
                ["Auth", auth],
                ["Roles", roles],
            ],
            col_widths=[30 * mm, 120 * mm],
            header_bg=C_ACCENT,
        )
    )
    if req_headers:
        story.append(h3("Request Headers"))
        story.append(make_table(["Header", "Required", "설명"], req_headers, col_widths=[45 * mm, 22 * mm, 83 * mm], header_bg=C_ACCENT))
    if path_params:
        story.append(h3("Path Parameters"))
        story.append(make_table(["Name", "Type", "설명"], path_params, col_widths=[40 * mm, 25 * mm, 85 * mm], header_bg=C_ACCENT))
    if query_params:
        story.append(h3("Query Parameters"))
        story.append(make_table(["Name", "Type", "설명"], query_params, col_widths=[40 * mm, 25 * mm, 85 * mm], header_bg=C_ACCENT))
    if req_body:
        story.append(h3("Request Body (JSON)"))
        story.append(P(f"<font face='Courier'>{req_body}</font>", "code"))
    if res_body:
        story.append(h3("Response Body (JSON) — 200/201"))
        story.append(P(f"<font face='Courier'>{res_body}</font>", "code"))
    if errors:
        story.append(h3("Error Responses"))
        story.append(make_table(["HTTP", "Code", "설명"], errors, col_widths=[22 * mm, 40 * mm, 88 * mm], header_bg=C_ACCENT))


def build_api_spec():
    story = []
    cover_page(
        story,
        "API 명세서",
        "REST API Specification (OpenAPI-oriented)",
        "1.0",
        "API Specification",
        "Backend / Frontend / AI 연동 개발자",
    )
    toc_block(
        story,
        [
            "개요 및 공통 규약",
            "인증·인가",
            "공통 에러 포맷",
            "Auth API",
            "Workspace API",
            "Members & Invitations API",
            "Documents API",
            "Onboarding Plans API",
            "Recommendations API",
            "Checklists API",
            "Chat (Knowledge Assistant) API",
            "Dashboard & Progress API",
            "Templates API",
            "Admin Audit API",
            "웹훅/비동기 작업",
            "상태 코드 총괄",
            "버전 관리 및 호환성",
        ],
    )

    # 1
    story.append(section_title("1", "개요 및 공통 규약"))
    story.append(
        make_table(
            ["항목", "내용"],
            [
                ["Base URL (local)", "http://localhost:8080/api/v1"],
                ["Base URL (prod)", "https://{domain}/api/v1"],
                ["Protocol", "HTTPS (prod), HTTP (local)"],
                ["Format", "JSON (application/json)"],
                ["Charset", "UTF-8"],
                ["Time", "ISO-8601 UTC (예: 2026-07-29T12:00:00Z)"],
                ["Auth", "Authorization: Bearer &lt;access_token&gt;"],
                ["Workspace Context", "X-Workspace-Id: &lt;uuid&gt; (멀티 소속 시 필수 권장)"],
                ["API Docs", "Swagger UI / OpenAPI 3.0 ( /swagger-ui )"],
                ["ID 형식", "UUID v4"],
            ],
            col_widths=[40 * mm, 110 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("1.1 설계 원칙"))
    story.extend(
        bullets(
            [
                "모든 리소스는 workspace 스코프로 격리한다.",
                "AI 응답은 항상 citations 필드를 포함한다 (없으면 []).",
                "권한 거부는 403, 미존재(또는 교차 테넌트 은닉)는 404 정책을 엔드포인트별로 명시한다.",
                "목록 API는 page, size, sort 표준 페이징을 사용한다 (page=0-based).",
                "파괴적 작업은 soft delete를 기본으로 한다 (문서 등).",
            ]
        )
    )
    story.append(subsection("1.2 표준 페이징 응답"))
    story.append(
        P(
            '{"items":[],"page":0,"size":20,"totalElements":0,"totalPages":0}',
            "code",
        )
    )

    # 2
    story.append(section_title("2", "인증·인가"))
    story.extend(
        bullets(
            [
                "로그인 성공 시 accessToken(JWT) 반환. (MVP: refreshToken 선택)",
                "JWT Claims 예: sub(userId), email, roles[], exp, iat",
                "보호 API는 Spring Security 필터에서 검증",
                "메서드 시큐리티로 Role 체크 (@PreAuthorize)",
                "문서 단위 ACL은 서비스 레이어 PermissionService로 추가 검증",
            ]
        )
    )
    story.append(subsection("2.1 역할 코드"))
    story.append(P("OWNER, ADMIN, MANAGER, MEMBER, NEW_HIRE", "body_left"))

    # 3
    story.append(section_title("3", "공통 에러 포맷"))
    story.append(
        P(
            '{"timestamp":"2026-07-29T12:00:00Z","status":403,"error":"Forbidden",'
            '"code":"DOCUMENT_ACCESS_DENIED","message":"해당 문서에 접근 권한이 없습니다.",'
            '"path":"/api/v1/chat/messages","traceId":"b7c1..."}',
            "code",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        make_table(
            ["code", "의미"],
            [
                ["UNAUTHORIZED", "인증 필요/토큰 무효"],
                ["FORBIDDEN", "인가 실패"],
                ["DOCUMENT_ACCESS_DENIED", "문서 ACL 거부"],
                ["WORKSPACE_MISMATCH", "리소스와 workspace 불일치"],
                ["VALIDATION_ERROR", "요청 검증 실패"],
                ["RESOURCE_NOT_FOUND", "리소스 없음"],
                ["CONFLICT", "중복 등 충돌"],
                ["DOCUMENT_NOT_READY", "임베딩 미완료"],
                ["AI_PROVIDER_ERROR", "LLM/임베딩 제공자 오류"],
                ["RATE_LIMITED", "요청 한도 초과"],
            ],
            col_widths=[50 * mm, 100 * mm],
        )
    )

    # 4 Auth
    story.append(section_title("4", "Auth API"))
    api_endpoint(
        story, "POST", "/auth/signup", "회원가입",
        "No", "-",
        "이메일/비밀번호/이름로 계정을 생성한다.",
        [["Content-Type", "Yes", "application/json"]],
        None, None,
        '{\n  "email": "user@company.com",\n  "password": "********",\n  "name": "김신입"\n}',
        '{\n  "userId": "uuid",\n  "email": "user@company.com",\n  "name": "김신입",\n  "accessToken": "jwt...",\n  "tokenType": "Bearer",\n  "expiresIn": 3600\n}',
        [["400", "VALIDATION_ERROR", "이메일 형식/비밀번호 정책"], ["409", "CONFLICT", "이미 가입된 이메일"]],
    )
    api_endpoint(
        story, "POST", "/auth/login", "로그인",
        "No", "-",
        "이메일/비밀번호로 JWT를 발급한다.",
        [["Content-Type", "Yes", "application/json"]],
        None, None,
        '{\n  "email": "user@company.com",\n  "password": "********"\n}',
        '{\n  "userId": "uuid",\n  "accessToken": "jwt...",\n  "tokenType": "Bearer",\n  "expiresIn": 3600,\n  "workspaces": [{"id":"uuid","name":"Acme","role":"NEW_HIRE"}]\n}',
        [["401", "UNAUTHORIZED", "자격 증명 실패"]],
    )
    api_endpoint(
        story, "GET", "/auth/me", "내 정보",
        "Bearer", "ALL",
        "현재 사용자 프로필, 역할, workspace 목록을 반환한다.",
        [["Authorization", "Yes", "Bearer token"], ["X-Workspace-Id", "No", "현재 workspace"]],
        None, None, None,
        '{\n  "id": "uuid",\n  "email": "user@company.com",\n  "name": "김신입",\n  "currentWorkspace": {"id":"uuid","name":"Acme","role":"NEW_HIRE"},\n  "profile": {"department":"Engineering","careerLevel":"JUNIOR","title":"Backend"}\n}',
        [["401", "UNAUTHORIZED", "토큰 없음/만료"]],
    )
    api_endpoint(
        story, "POST", "/auth/logout", "로그아웃",
        "Bearer", "ALL",
        "클라이언트 토큰 폐기 유도. MVP는 서버 블랙리스트 선택.",
        [["Authorization", "Yes", "Bearer token"]],
        None, None, None,
        '{\n  "success": true\n}',
        [["401", "UNAUTHORIZED", "토큰 무효"]],
    )

    # 5 Workspace
    story.append(section_title("5", "Workspace API"))
    api_endpoint(
        story, "POST", "/workspaces", "Workspace 생성",
        "Bearer", "ALL(생성자→OWNER)",
        "새 회사 Workspace를 생성하고 생성자를 OWNER로 등록한다.",
        [["Authorization", "Yes", "Bearer"], ["Content-Type", "Yes", "application/json"]],
        None, None,
        '{\n  "name": "Acme Corp",\n  "slug": "acme"\n}',
        '{\n  "id": "uuid",\n  "name": "Acme Corp",\n  "slug": "acme",\n  "createdAt": "2026-07-29T12:00:00Z"\n}',
        [["409", "CONFLICT", "slug 중복"], ["400", "VALIDATION_ERROR", "이름/슬러그 검증"]],
    )
    api_endpoint(
        story, "GET", "/workspaces/me", "내 Workspace 목록",
        "Bearer", "ALL",
        "내가 속한 Workspace 목록과 역할을 반환한다.",
        [["Authorization", "Yes", "Bearer"]],
        None, None, None,
        '{\n  "items": [{"id":"uuid","name":"Acme","role":"ADMIN"}]\n}',
        [["401", "UNAUTHORIZED", "인증 실패"]],
    )
    api_endpoint(
        story, "PATCH", "/workspaces/{workspaceId}", "Workspace 수정",
        "Bearer", "OWNER, ADMIN",
        "이름 등 기본 설정을 수정한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Recommended", "uuid"]],
        [["workspaceId", "uuid", "대상 Workspace"]],
        None,
        '{\n  "name": "Acme Corporation"\n}',
        '{\n  "id": "uuid",\n  "name": "Acme Corporation",\n  "slug": "acme"\n}',
        [["403", "FORBIDDEN", "권한 없음"], ["404", "RESOURCE_NOT_FOUND", "없음"]],
    )

    # 6 Members
    story.append(section_title("6", "Members & Invitations API"))
    api_endpoint(
        story, "POST", "/members/invitations", "멤버 초대",
        "Bearer", "OWNER, ADMIN",
        "이메일과 역할로 초대를 생성한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"], ["Content-Type", "Yes", "json"]],
        None, None,
        '{\n  "email": "newbie@company.com",\n  "role": "NEW_HIRE",\n  "department": "Engineering",\n  "careerLevel": "JUNIOR",\n  "title": "Frontend Developer"\n}',
        '{\n  "invitationId": "uuid",\n  "email": "newbie@company.com",\n  "role": "NEW_HIRE",\n  "token": "invite-token",\n  "expiresAt": "2026-08-05T00:00:00Z",\n  "status": "PENDING"\n}',
        [["403", "FORBIDDEN", "권한 없음"], ["409", "CONFLICT", "이미 멤버/초대 존재"]],
    )
    api_endpoint(
        story, "POST", "/members/invitations/{token}/accept", "초대 수락",
        "Bearer", "초대받은 사용자",
        "초대 토큰을 수락하여 멤버십을 활성화한다. 성공 시 온보딩 계획 생성 트리거 가능.",
        [["Authorization", "Yes", "Bearer"]],
        [["token", "string", "초대 토큰"]],
        None, None,
        '{\n  "workspaceId": "uuid",\n  "role": "NEW_HIRE",\n  "membershipId": "uuid",\n  "onboardingPlanId": "uuid"\n}',
        [["410", "CONFLICT", "만료/사용됨"], ["404", "RESOURCE_NOT_FOUND", "토큰 없음"]],
    )
    api_endpoint(
        story, "GET", "/members", "멤버 목록",
        "Bearer", "OWNER, ADMIN, MANAGER",
        "Workspace 멤버 목록을 페이징 조회한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None,
        [["page", "int", "default 0"], ["size", "int", "default 20"], ["role", "string", "필터(optional)"]],
        None,
        '{\n  "items": [{"id":"uuid","userId":"uuid","name":"김신입","email":"...","role":"NEW_HIRE","status":"ACTIVE"}],\n  "page":0,"size":20,"totalElements":1,"totalPages":1\n}',
        [["403", "FORBIDDEN", "권한 없음"]],
    )
    api_endpoint(
        story, "PATCH", "/members/{memberId}", "멤버 역할/상태 변경",
        "Bearer", "OWNER, ADMIN",
        "역할 또는 상태(ACTIVE/DISABLED)를 변경한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["memberId", "uuid", "멤버십 ID"]],
        None,
        '{\n  "role": "MEMBER",\n  "status": "ACTIVE"\n}',
        '{\n  "id": "uuid",\n  "role": "MEMBER",\n  "status": "ACTIVE"\n}',
        [["403", "FORBIDDEN", "권한 없음"], ["404", "RESOURCE_NOT_FOUND", "멤버 없음"]],
    )

    # 7 Documents
    story.append(section_title("7", "Documents API"))
    api_endpoint(
        story, "POST", "/documents", "문서 업로드",
        "Bearer", "OWNER, ADMIN, MANAGER",
        "multipart/form-data로 파일을 업로드하고 임베딩 파이프라인을 시작한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"], ["Content-Type", "Yes", "multipart/form-data"]],
        None, None,
        'multipart fields:\n- file: (binary)\n- title: string (optional)\n- visibility: RESTRICTED|WORKSPACE (optional)\n- allowedRoles: ["MEMBER","ADMIN"] (optional JSON)',
        '{\n  "id": "uuid",\n  "title": "개발팀 온보딩 가이드.pdf",\n  "status": "PENDING",\n  "mimeType": "application/pdf",\n  "sizeBytes": 204800,\n  "createdAt": "2026-07-29T12:00:00Z"\n}',
        [["400", "VALIDATION_ERROR", "확장자/크기"], ["403", "FORBIDDEN", "권한 없음"]],
    )
    api_endpoint(
        story, "GET", "/documents", "문서 목록",
        "Bearer", "문서 읽기 권한 보유자",
        "Workspace 문서 목록. 사용자 ACL에 따라 필터링될 수 있다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None,
        [["page", "int", "0"], ["size", "int", "20"], ["status", "string", "PENDING|PROCESSING|READY|FAILED"]],
        None,
        '{\n  "items": [{"id":"uuid","title":"...","status":"READY","createdAt":"..."}],\n  "page":0,"size":20,"totalElements":3,"totalPages":1\n}',
        [["401", "UNAUTHORIZED", "인증 실패"]],
    )
    api_endpoint(
        story, "GET", "/documents/{documentId}", "문서 상세",
        "Bearer", "ACL 허용",
        "문서 메타데이터와 처리 상태를 조회한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["documentId", "uuid", "문서 ID"]],
        None, None,
        '{\n  "id":"uuid",\n  "title":"...",\n  "status":"READY",\n  "chunkCount":42,\n  "allowedRoles":["MEMBER","ADMIN"],\n  "errorMessage":null,\n  "createdAt":"...",\n  "updatedAt":"..."\n}',
        [["403", "DOCUMENT_ACCESS_DENIED", "ACL 거부"], ["404", "RESOURCE_NOT_FOUND", "없음"]],
    )
    api_endpoint(
        story, "POST", "/documents/{documentId}/reprocess", "문서 재처리",
        "Bearer", "OWNER, ADMIN, MANAGER",
        "FAILED 또는 구버전 문서를 다시 파싱/임베딩한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["documentId", "uuid", "문서 ID"]],
        None, None,
        '{\n  "id":"uuid",\n  "status":"PENDING"\n}',
        [["404", "RESOURCE_NOT_FOUND", "없음"], ["403", "FORBIDDEN", "권한 없음"]],
    )
    api_endpoint(
        story, "DELETE", "/documents/{documentId}", "문서 삭제(soft)",
        "Bearer", "OWNER, ADMIN",
        "문서를 soft delete하고 벡터 인덱스를 비활성화한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["documentId", "uuid", "문서 ID"]],
        None, None,
        '{\n  "success": true\n}',
        [["403", "FORBIDDEN", "권한 없음"], ["404", "RESOURCE_NOT_FOUND", "없음"]],
    )

    # 8 Plans
    story.append(section_title("8", "Onboarding Plans API"))
    api_endpoint(
        story, "POST", "/onboarding-plans/generate", "30일 계획 생성",
        "Bearer", "OWNER, ADMIN, SYSTEM(본인 트리거 가능)",
        "대상 사용자에 대한 개인 30일 온보딩 계획을 생성한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None, None,
        '{\n  "userId": "uuid",\n  "templateId": "uuid|null",\n  "force": false\n}',
        '{\n  "planId": "uuid",\n  "userId": "uuid",\n  "startDate": "2026-07-29",\n  "endDate": "2026-08-27",\n  "itemCount": 48,\n  "status": "ACTIVE"\n}',
        [["404", "RESOURCE_NOT_FOUND", "사용자 없음"], ["409", "CONFLICT", "이미 존재(force=false)"]],
    )
    api_endpoint(
        story, "GET", "/onboarding-plans/me", "내 온보딩 계획",
        "Bearer", "NEW_HIRE 등 본인",
        "현재 사용자 활성 온보딩 계획과 항목을 반환한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None,
        [["includeItems", "boolean", "default true"]],
        None,
        '{\n  "planId":"uuid",\n  "status":"ACTIVE",\n  "progressPercent":12.5,\n  "items":[\n    {"id":"uuid","dayIndex":1,"type":"DOCUMENT","title":"회사 소개 읽기",\n     "documentId":"uuid","status":"PENDING","sortOrder":1}\n  ]\n}',
        [["404", "RESOURCE_NOT_FOUND", "계획 없음"]],
    )
    api_endpoint(
        story, "GET", "/onboarding-plans/{planId}", "계획 상세",
        "Bearer", "본인 또는 ADMIN/MANAGER",
        "특정 계획 상세 조회.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["planId", "uuid", "계획 ID"]],
        None, None,
        '{ "planId":"uuid", "userId":"uuid", "items":[] }',
        [["403", "FORBIDDEN", "타인 계획"], ["404", "RESOURCE_NOT_FOUND", "없음"]],
    )
    api_endpoint(
        story, "POST", "/onboarding-plans/{planId}/regenerate", "계획 재생성",
        "Bearer", "OWNER, ADMIN",
        "기존 계획을 새 버전으로 재생성한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["planId", "uuid", "계획 ID"]],
        None,
        '{\n  "keepCompleted": true\n}',
        '{\n  "planId":"uuid",\n  "version":2,\n  "status":"ACTIVE"\n}',
        [["403", "FORBIDDEN", "권한 없음"]],
    )
    api_endpoint(
        story, "PATCH", "/onboarding-plans/items/{itemId}", "계획 항목 상태 변경",
        "Bearer", "본인 또는 ADMIN",
        "항목 완료/미완료 상태를 갱신한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["itemId", "uuid", "항목 ID"]],
        None,
        '{\n  "status": "DONE"\n}',
        '{\n  "id":"uuid",\n  "status":"DONE",\n  "completedAt":"2026-07-29T12:00:00Z"\n}',
        [["404", "RESOURCE_NOT_FOUND", "항목 없음"]],
    )

    # 9 Recommendations
    story.append(section_title("9", "Recommendations API"))
    api_endpoint(
        story, "GET", "/recommendations/today", "오늘 할 일 추천",
        "Bearer", "본인",
        "Proactive 일일 추천 목록을 반환한다. 대시보드 진입 시 호출.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None,
        [["date", "string", "YYYY-MM-DD (optional, default today)"]],
        None,
        '{\n  "date":"2026-07-29",\n  "items":[\n    {"id":"uuid","type":"DOCUMENT","title":"보안 정책 읽기","priority":1,\n     "source":"PLAN","planItemId":"uuid","documentId":"uuid","status":"PENDING"},\n    {"id":"uuid","type":"PERSON","title":"Buddy 미팅","personName":"이멘토","status":"PENDING"},\n    {"id":"uuid","type":"CHECKLIST","title":"개발환경 세팅","status":"PENDING"},\n    {"id":"uuid","type":"PRACTICE","title":"샘플 API 호출 실습","status":"PENDING"}\n  ]\n}',
        [["401", "UNAUTHORIZED", "인증 실패"]],
    )
    api_endpoint(
        story, "POST", "/recommendations/{recommendationId}/complete", "추천 항목 완료",
        "Bearer", "본인",
        "오늘 할 일 항목을 완료 처리하고 연관 체크리스트/계획 항목을 동기화한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["recommendationId", "uuid", "추천 ID"]],
        None, None,
        '{\n  "id":"uuid",\n  "status":"DONE",\n  "progressPercent":20.0\n}',
        [["404", "RESOURCE_NOT_FOUND", "없음"]],
    )

    # 10 Checklists
    story.append(section_title("10", "Checklists API"))
    api_endpoint(
        story, "GET", "/checklists/me", "내 체크리스트",
        "Bearer", "본인",
        "할당된 체크리스트와 항목을 반환한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None,
        [["status", "string", "ALL|PENDING|DONE"]],
        None,
        '{\n  "items":[{"id":"uuid","title":"노트북 수령","status":"DONE","dueDay":1}],\n  "total":10,\n  "done":2,\n  "progressPercent":20.0\n}',
        [["401", "UNAUTHORIZED", "인증 실패"]],
    )
    api_endpoint(
        story, "PATCH", "/checklists/items/{itemId}", "체크리스트 항목 갱신",
        "Bearer", "본인",
        "완료 상태를 토글/설정한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["itemId", "uuid", "항목 ID"]],
        None,
        '{\n  "status": "DONE"\n}',
        '{\n  "id":"uuid",\n  "status":"DONE",\n  "completedAt":"2026-07-29T12:00:00Z",\n  "progressPercent":30.0\n}',
        [["404", "RESOURCE_NOT_FOUND", "없음"], ["403", "FORBIDDEN", "타인 항목"]],
    )

    # 11 Chat
    story.append(section_title("11", "Chat (Knowledge Assistant) API"))
    story.append(
        info_box(
            "보안 파이프라인",
            "Retrieve(workspace) → Permission Check → LLM → Citation → Audit Log. "
            "Permission 실패 청크는 컨텍스트에서 제거한다.",
        )
    )
    api_endpoint(
        story, "POST", "/chat/messages", "질문 전송",
        "Bearer", "Workspace 멤버",
        "회사 문서 기반 답변을 생성한다. citations 필수.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"], ["Content-Type", "Yes", "json"]],
        None, None,
        '{\n  "sessionId": "uuid|null",\n  "message": "배포 파이프라인은 어떻게 동작하나요?",\n  "stream": false\n}',
        '{\n  "sessionId":"uuid",\n  "messageId":"uuid",\n  "role":"assistant",\n  "answer":"배포는 GitHub Actions에서 ...",\n  "citations":[\n    {"documentId":"uuid","title":"배포 가이드","chunkId":"uuid","snippet":"...","page":3}\n  ],\n  "permissionDeniedDocumentIds":[],\n  "createdAt":"2026-07-29T12:00:00Z"\n}',
        [
            ["400", "VALIDATION_ERROR", "빈 메시지"],
            ["403", "DOCUMENT_ACCESS_DENIED", "접근 가능 근거 없음(정책에 따라 200+고지도 가능)"],
            ["503", "AI_PROVIDER_ERROR", "LLM 장애"],
        ],
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        warn_box(
            "권한 거부 응답 예시 (내용 미노출)",
            '{"sessionId":"uuid","messageId":"uuid","role":"assistant",'
            '"answer":"접근 권한이 있는 문서에서 확인된 근거가 없어 답변드릴 수 없습니다. 관리자에게 권한을 요청하세요.",'
            '"citations":[],"permissionDeniedDocumentIds":["uuid-sensitive"],"createdAt":"..."}',
        )
    )
    api_endpoint(
        story, "GET", "/chat/sessions", "채팅 세션 목록",
        "Bearer", "본인",
        "내 채팅 세션 목록.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None,
        [["page", "int", "0"], ["size", "int", "20"]],
        None,
        '{\n  "items":[{"id":"uuid","title":"배포 파이프라인","updatedAt":"..."}],\n  "page":0,"size":20,"totalElements":1,"totalPages":1\n}',
        [["401", "UNAUTHORIZED", "인증 실패"]],
    )
    api_endpoint(
        story, "GET", "/chat/sessions/{sessionId}", "세션 메시지 조회",
        "Bearer", "본인",
        "세션의 메시지와 citation을 시간순 반환.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["sessionId", "uuid", "세션 ID"]],
        None, None,
        '{\n  "id":"uuid",\n  "messages":[\n    {"id":"uuid","role":"user","content":"...","createdAt":"..."},\n    {"id":"uuid","role":"assistant","content":"...","citations":[]}\n  ]\n}',
        [["404", "RESOURCE_NOT_FOUND", "없음"], ["403", "FORBIDDEN", "타인 세션"]],
    )

    # 12 Dashboard & Progress
    story.append(section_title("12", "Dashboard & Progress API"))
    api_endpoint(
        story, "GET", "/dashboard/me", "신입 대시보드 집계",
        "Bearer", "본인",
        "오늘 할 일 요약, 진행률, 계획 요약, 빠른 링크를 한 번에 반환 (BFF 성격).",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None, None, None,
        '{\n  "progressPercent":20.0,\n  "today":{"total":5,"done":1,"items":[]},\n  "plan":{"planId":"uuid","currentDay":3,"totalDays":30},\n  "checklist":{"total":10,"done":2}\n}',
        [["401", "UNAUTHORIZED", "인증 실패"]],
    )
    api_endpoint(
        story, "GET", "/progress/me", "내 진행률",
        "Bearer", "본인",
        "계획 대비 진행률과 지연 항목 요약.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None, None, None,
        '{\n  "progressPercent":20.0,\n  "completedItems":8,\n  "totalItems":40,\n  "overdueItems":[{"id":"uuid","title":"...","dayIndex":2}],\n  "bottlenecks":["문서 미완료","Buddy 미팅 미실시"]\n}',
        [["404", "RESOURCE_NOT_FOUND", "계획 없음"]],
    )
    api_endpoint(
        story, "GET", "/admin/progress", "관리자 진행 현황 목록",
        "Bearer", "OWNER, ADMIN, MANAGER",
        "신입별 진행 요약 리스트.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None,
        [["page", "int", "0"], ["size", "int", "20"]],
        None,
        '{\n  "items":[{"userId":"uuid","name":"김신입","progressPercent":20.0,"status":"ON_TRACK"}],\n  "page":0,"size":20,"totalElements":1,"totalPages":1\n}',
        [["403", "FORBIDDEN", "권한 없음"]],
    )
    api_endpoint(
        story, "GET", "/admin/progress/{userId}", "신입 상세 진행",
        "Bearer", "OWNER, ADMIN, MANAGER",
        "특정 신입의 상세 진행/병목.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["userId", "uuid", "사용자 ID"]],
        None, None,
        '{\n  "userId":"uuid",\n  "progressPercent":20.0,\n  "planId":"uuid",\n  "overdueItems":[],\n  "insights":"기초 문서 학습이 지연되고 있습니다."\n}',
        [["403", "FORBIDDEN", "권한 없음"], ["404", "RESOURCE_NOT_FOUND", "없음"]],
    )

    # 13 Templates
    story.append(section_title("13", "Templates API"))
    api_endpoint(
        story, "GET", "/templates", "템플릿 목록",
        "Bearer", "OWNER, ADMIN, MANAGER",
        "역할별 온보딩 템플릿 목록.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None, None, None,
        '{\n  "items":[{"id":"uuid","name":"Backend NEW_HIRE","targetRole":"NEW_HIRE","updatedAt":"..."}]\n}',
        [["403", "FORBIDDEN", "권한 없음"]],
    )
    api_endpoint(
        story, "POST", "/templates", "템플릿 생성",
        "Bearer", "OWNER, ADMIN",
        "온보딩 템플릿을 생성한다.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None, None,
        '{\n  "name":"Backend NEW_HIRE",\n  "targetRole":"NEW_HIRE",\n  "items":[{"dayIndex":1,"type":"CHECKLIST","title":"계정 발급 확인"}]\n}',
        '{\n  "id":"uuid",\n  "name":"Backend NEW_HIRE"\n}',
        [["400", "VALIDATION_ERROR", "검증 실패"]],
    )
    api_endpoint(
        story, "PATCH", "/templates/{templateId}", "템플릿 수정",
        "Bearer", "OWNER, ADMIN",
        "템플릿 메타/항목 수정.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["templateId", "uuid", "템플릿 ID"]],
        None,
        '{\n  "name":"Backend NEW_HIRE v2",\n  "items":[]\n}',
        '{\n  "id":"uuid",\n  "name":"Backend NEW_HIRE v2"\n}',
        [["404", "RESOURCE_NOT_FOUND", "없음"]],
    )

    # 14 Audit
    story.append(section_title("14", "Admin Audit API"))
    api_endpoint(
        story, "GET", "/admin/audit-logs", "감사 로그 조회",
        "Bearer", "OWNER, ADMIN",
        "AI 접근, 권한 거부, 관리 액션 로그 조회.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        None,
        [
            ["page", "int", "0"],
            ["size", "int", "50"],
            ["actorId", "uuid", "optional"],
            ["eventType", "string", "CHAT_QUERY|DOC_ACCESS_DENIED|..."],
            ["from", "datetime", "optional"],
            ["to", "datetime", "optional"],
        ],
        None,
        '{\n  "items":[{\n    "id":"uuid",\n    "eventType":"DOC_ACCESS_DENIED",\n    "actorId":"uuid",\n    "resourceType":"DOCUMENT",\n    "resourceId":"uuid",\n    "result":"DENIED",\n    "metadata":{"reason":"role"},\n    "createdAt":"..."\n  }],\n  "page":0,"size":50,"totalElements":1,"totalPages":1\n}',
        [["403", "FORBIDDEN", "권한 없음"]],
    )

    # 15 async
    story.append(section_title("15", "웹훅/비동기 작업"))
    story.extend(
        bullets(
            [
                "문서 임베딩은 비동기 Job으로 처리한다. Document.status로 폴링.",
                "MVP에서는 WebSocket 없이 클라이언트 폴링(2~5초) 허용.",
                "Job 엔티티 예시: id, type=DOCUMENT_INGEST, status, progress, errorMessage.",
                "선택 API: GET /jobs/{jobId}",
            ]
        )
    )
    api_endpoint(
        story, "GET", "/jobs/{jobId}", "비동기 Job 상태",
        "Bearer", "관련 권한자",
        "문서 처리 등 백그라운드 작업 상태 조회.",
        [["Authorization", "Yes", "Bearer"], ["X-Workspace-Id", "Yes", "uuid"]],
        [["jobId", "uuid", "Job ID"]],
        None, None,
        '{\n  "id":"uuid",\n  "type":"DOCUMENT_INGEST",\n  "status":"PROCESSING",\n  "progress":60,\n  "errorMessage":null\n}',
        [["404", "RESOURCE_NOT_FOUND", "없음"]],
    )

    # 16 status
    story.append(section_title("16", "상태 코드 총괄"))
    story.append(
        make_table(
            ["HTTP", "사용"],
            [
                ["200", "조회·수정 성공"],
                ["201", "생성 성공"],
                ["204", "성공(바디 없음) — 선택"],
                ["400", "검증 실패"],
                ["401", "미인증"],
                ["403", "인가 실패 / 문서 ACL 거부"],
                ["404", "리소스 없음 / 교차 테넌트 은닉"],
                ["409", "충돌(중복 등)"],
                ["410", "만료된 초대"],
                ["413", "파일 너무 큼"],
                ["415", "지원하지 않는 미디어 타입"],
                ["429", "Rate limit"],
                ["500", "서버 오류"],
                ["503", "AI 제공자/의존 서비스 장애"],
            ],
            col_widths=[25 * mm, 125 * mm],
        )
    )

    # 17 versioning
    story.append(section_title("17", "버전 관리 및 호환성"))
    story.extend(
        bullets(
            [
                "URL prefix /api/v1 고정. breaking change 시 /api/v2.",
                "응답 필드 추가는 non-breaking. 필드 삭제·의미 변경은 major.",
                "OpenAPI 스펙을 코드 생성/문서의 SSOT로 유지한다.",
                "본 문서는 기능명세서·PRD와 정합되어야 하며, 불일치 시 PRD 원칙(TTP, Permission, Citation)이 우선한다.",
            ]
        )
    )

    story.append(section_title("18", "도메인 모델 요약 (API 관점)"))
    story.append(
        make_table(
            ["엔티티", "핵심 필드"],
            [
                ["User", "id, email, name, passwordHash"],
                ["Workspace", "id, name, slug"],
                ["Membership", "id, workspaceId, userId, role, status"],
                ["Invitation", "id, workspaceId, email, role, token, expiresAt, status"],
                ["Document", "id, workspaceId, title, storageKey, status, allowedRoles"],
                ["DocumentChunk", "id, documentId, workspaceId, content, embedding, chunkIndex"],
                ["OnboardingPlan", "id, workspaceId, userId, startDate, status, version"],
                ["OnboardingPlanItem", "id, planId, dayIndex, type, title, status, documentId"],
                ["ChecklistItem", "id, userId, title, status, planItemId"],
                ["ChatSession / ChatMessage", "id, workspaceId, userId, role, content, citations JSON"],
                ["AuditLog", "id, workspaceId, actorId, eventType, resource*, result, metadata"],
            ],
            col_widths=[45 * mm, 105 * mm],
        )
    )

    story.append(Spacer(1, 4 * mm))
    story.append(
        info_box(
            "구현 노트",
            "Backend: Spring Boot REST 컨트롤러 + Service + JPA. Vector: pgvector. "
            "AI: LangChain4j. 파일: Supabase Storage. 모든 AI 응답 Citation + Permission Check 필수.",
        )
    )

    return story


# ===========================================================================
# 4. AI LEARN FIRST (바이브코딩용 학습 문서)
# ===========================================================================
def build_ai_learn():
    """CLI에서 디렉토리를 열고 바이브코딩을 시작할 때 AI가 먼저 학습할 문서."""
    story = []
    cover_page(
        story,
        "AI LEARN FIRST",
        "바이브코딩 시작 전 필수 학습 가이드 (AI Coding Agents)",
        "1.0",
        "AI Onboarding / Context Pack",
        "Cursor · Claude Code · Codex · Gemini · Grok · 기타 AI 코딩 도구",
    )

    # Immediate instructions box
    story.append(
        warn_box(
            "AI: READ THIS FIRST",
            "이 저장소를 CLI/IDE로 연 뒤 코드를 생성·수정하기 전에 본 문서를 끝까지 학습하라. "
            "상세 내용은 docs/ 아래 PRD·기능명세·API 명세를 참조하되, 충돌 시 본 문서의 "
            "원칙(TTP First / Permission before Answer / Citation Always)이 우선한다. "
            "단순 RAG 챗봇·LMS·문서검색기를 만들지 마라.",
        )
    )
    story.append(Spacer(1, 3 * mm))

    toc_block(
        story,
        [
            "30초 요약 (One-Pager)",
            "문서 맵 & 읽기 순서",
            "디렉토리 구조 (현재 + 목표)",
            "제품 본질 / 절대 금지",
            "MVP 범위 체크리스트",
            "기술 스택 & 아키텍처",
            "보안·권한 불변식 (Invariants)",
            "도메인 모델 요약",
            "API 표면 요약",
            "바이브코딩 워크플로 (1기능=1프롬프트)",
            "구현 순서 (권장 로드맵)",
            "코딩 컨벤션",
            "완료 정의 (Definition of Done)",
            "프롬프트 템플릿",
            "자주 하는 실수 (Anti-Patterns)",
            "의사결정 트리",
            "체크리스트 (세션 시작/종료)",
        ],
    )

    # 1
    story.append(section_title("1", "30초 요약 (One-Pager)"))
    story.append(
        info_box(
            "OnboardOS in one sentence",
            "신입의 Time To Productivity(TTP)를 줄이는 AI Organizational Operating System. "
            "챗봇이 아니라 조직 적응을 설계·운영·분석하는 Proactive AI 플랫폼.",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        make_table(
            ["축", "핵심"],
            [
                ["KPI", "Time To Productivity (TTP) — 독립 첫 업무 완수까지 시간"],
                ["철학", "Reactive(질문 응답) → Proactive(오늘 할 일·30일 계획 먼저)"],
                ["MVP 핵심 3종", "① 30일 계획 생성 ② 오늘 할 일 추천 ③ Chat+Citation+Permission"],
                ["보안 불변식", "Workspace Isolation · RBAC · AI도 사람 권한 동일 · Citation 100%"],
                ["스택", "Next.js/TS/Tailwind/shadcn · Spring Boot/Java · PostgreSQL+pgvector · LangChain4j"],
                ["게이트 질문", "이 기능이 TTP를 실제로 높이는가? → No면 구현 금지"],
            ],
            col_widths=[35 * mm, 115 * mm],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(subsection("1.1 성공 데모 한 줄"))
    story.append(
        P(
            "Admin이 Workspace를 만들고 문서를 올리면 → 신입이 로그인했을 때 "
            "30일 계획 + 오늘 할 일을 받고 → 권한 검증된 Citation 기반 질답을 한다. "
            "이것이 end-to-end로 돌아가야 MVP 성공이다."
        )
    )

    # 2
    story.append(section_title("2", "문서 맵 & 읽기 순서"))
    story.append(
        make_table(
            ["순서", "파일", "용도", "언제"],
            [
                ["0 (필수)", "AI_LEARN_FIRST.pdf (본 문서)", "컨텍스트·원칙·워크플로", "매 세션 시작"],
                ["1", "docs/OnboardOS_상세_PRD.pdf", "비전·범위·KPI·비기능", "방향 충돌 시"],
                ["2", "docs/OnboardOS_기능명세서.pdf", "F-xx 수용 기준·플로우", "기능 구현 직전"],
                ["3", "docs/OnboardOS_API_명세서.pdf", "엔드포인트·스키마·에러", "API/FE 연동 시"],
                ["4", "docs/OnboardOS_ERD.md|.pdf", "테이블·관계·제약·인덱스", "DB/엔티티 구현 시"],
                ["5", "scripts/generate_docs.py", "문서 재생성 소스", "문서 수정 시"],
            ],
            col_widths=[22 * mm, 52 * mm, 46 * mm, 30 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.extend(
        bullets(
            [
                "문서 간 불일치 시: PRD 원칙 > 기능명세 수용기준 > API 세부 스키마 > ERD 컬럼 순으로 맞춘다.",
                "코드를 쓰기 전에 해당 기능 ID(F-xx)와 API path·테이블을 명세에서 확인한다.",
                "스키마 구현 시 ERD의 workspace_id·UK·FK·soft delete 규칙을 그대로 따른다.",
                "문서 PDF/MD는 학습용이다. 런타임 SSOT는 마이그레이션 코드 + OpenAPI가 된다.",
            ]
        )
    )

    # 3
    story.append(section_title("3", "디렉토리 구조 (현재 + 목표)"))
    story.append(subsection("3.1 현재 상태 (문서·부트스트랩 단계)"))
    story.append(
        P(
            "onboard-platform/\n"
            "├── AI_LEARN_FIRST.pdf          ← AI 필수 학습 (본 문서, 루트)\n"
            "├── docs/\n"
            "│   ├── OnboardOS_상세_PRD.pdf\n"
            "│   ├── OnboardOS_기능명세서.pdf\n"
            "│   └── OnboardOS_API_명세서.pdf\n"
            "├── scripts/\n"
            "│   └── generate_docs.py        ← PDF 재생성\n"
            "└── .venv/                       ← 문서 생성용 (앱 런타임 아님)",
            "code",
        )
    )
    story.append(subsection("3.2 목표 모노레포 구조 (구현 시 이 형태를 따른다)"))
    story.append(
        P(
            "onboard-platform/\n"
            "├── AI_LEARN_FIRST.pdf\n"
            "├── README.md\n"
            "├── docs/                          # 제품 문서 PDF\n"
            "├── scripts/                       # 유틸/문서 생성\n"
            "├── docker-compose.yml             # postgres(pgvector), backend, frontend, nginx\n"
            "├── frontend/                      # Next.js + React + TS + Tailwind + shadcn/ui\n"
            "│   ├── src/app/                   # App Router\n"
            "│   ├── src/components/\n"
            "│   ├── src/lib/api/               # API client\n"
            "│   └── package.json\n"
            "├── backend/                       # Spring Boot + Java\n"
            "│   ├── src/main/java/.../\n"
            "│   │   ├── domain/                # entities\n"
            "│   │   ├── repository/\n"
            "│   │   ├── service/               # business + PermissionService\n"
            "│   │   ├── web/                   # REST controllers\n"
            "│   │   ├── ai/                    # LangChain4j, RAG, Planner\n"
            "│   │   ├── security/              # JWT, OAuth2, RBAC\n"
            "│   │   └── config/\n"
            "│   └── src/main/resources/\n"
            "│       ├── application.yml\n"
            "│       └── db/migration/          # Flyway/Liquibase\n"
            "└── .github/workflows/             # CI",
            "code",
        )
    )
    story.extend(
        bullets(
            [
                "frontend / backend 경계를 섞지 않는다. 공유 타입은 OpenAPI 생성 또는 명시적 contract로.",
                "AI 로직은 backend/ai (또는 service/ai)에 모은다. FE에서 LLM API 키를 호출하지 않는다.",
                "workspace_id는 모든 도메인 테이블·쿼리의 필수 필터다.",
            ]
        )
    )

    # 4
    story.append(section_title("4", "제품 본질 / 절대 금지"))
    story.append(subsection("4.1 우리는 이것을 만든다"))
    story.extend(
        bullets(
            [
                "개인별 30일 온보딩 계획 자동 생성 (AI Onboarding Planner) — 가장 핵심",
                "매일 Proactive “오늘 할 일” 추천 (문서/사람/체크리스트/실습)",
                "회사 문서 RAG Chat + Citation 필수 + Permission Check",
                "체크리스트·진행률·신입/관리자 대시보드",
                "Workspace·문서 파이프라인(파싱→청킹→임베딩)·멤버 초대·RBAC",
            ]
        )
    )
    story.append(subsection("4.2 절대 만들지 마라 (Out of Scope)"))
    story.append(
        warn_box(
            "FORBIDDEN PRODUCT SHAPES",
            "× 단순 RAG 챗봇 　× LMS / 교육 플랫폼 　× 문서 검색 서비스 　× 일반 KMS. "
            "형태가 위와 같으면 기능 수가 많아도 실패다. 모든 기능은 TTP 게이트를 통과해야 한다.",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("4.3 관점 전환 (구현 판단용)"))
    story.append(
        make_table(
            ["하지 말 것", "해야 할 것"],
            [
                ["문서를 잘 읽게 하기", "독립 업무까지 시간 줄이기"],
                ["질문에 잘 답하기만", "질문 전에 오늘 할 일 제시"],
                ["검색 정확도만 최적화", "계획 준수·추천 완료·권한 0위반"],
                ["범용 챗 UI 먼저", "대시보드(오늘 할 일+진행률) 먼저"],
            ],
            col_widths=[75 * mm, 75 * mm],
        )
    )

    # 5
    story.append(section_title("5", "MVP 범위 체크리스트"))
    story.append(
        make_table(
            ["영역", "포함 (Must)", "제외 (Post-MVP)"],
            [
                ["관리자", "Workspace 생성, 문서 업로드(파싱·청킹·임베딩), 초대·역할", "고급 템플릿 에디터, 빌링"],
                ["신입", "대시보드, 오늘 할 일, 30일 계획, 체크리스트, Chat", "모바일 앱, 소셜 피드"],
                ["AI", "계획 생성, 일일 추천, RAG+Citation, 권한 검증", "암묵지 맵, Multi-LLM 라우팅"],
                ["분석", "진행률 % 기본 요약", "고급 ROI/TTP 대시보드, 인사이트 고도화"],
                ["인프라", "Docker Compose 단일 스택, logical workspace isolation", "회사별 Dedicated VPC 자동화"],
            ],
            col_widths=[28 * mm, 72 * mm, 50 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        make_table(
            ["ID", "기능", "P", "MVP"],
            [
                ["F-01", "AI Onboarding Planner", "P0", "Y"],
                ["F-02", "AI Recommendation Engine", "P0", "Y"],
                ["F-03", "AI Knowledge Assistant", "P0", "Y"],
                ["F-04", "체크리스트", "P0", "Y"],
                ["F-05", "신입 대시보드", "P0", "Y"],
                ["F-06", "Workspace", "P0", "Y"],
                ["F-07", "문서 파이프라인", "P0", "Y"],
                ["F-08", "멤버·RBAC", "P0", "Y"],
                ["F-09", "Progress Analyzer", "P1", "Partial"],
                ["F-10", "온보딩 템플릿", "P1", "Partial"],
                ["F-11", "Organizational Memory", "P2", "N"],
                ["F-12", "Audit Log", "P1", "Y(기본)"],
                ["F-13", "인증·세션", "P0", "Y"],
            ],
            col_widths=[18 * mm, 70 * mm, 22 * mm, 40 * mm],
        )
    )

    # 6
    story.append(section_title("6", "기술 스택 & 아키텍처"))
    story.append(
        make_table(
            ["영역", "선택 (고정)"],
            [
                ["Frontend", "Next.js + React + TypeScript + Tailwind + shadcn/ui"],
                ["Backend", "Spring Boot + Java + Spring Security + OAuth2 + JWT"],
                ["AI", "LangChain4j / OpenAI 기본 (Claude·Gemini 선택, 인터페이스 분리)"],
                ["DB", "PostgreSQL + pgvector"],
                ["Storage", "Supabase Storage"],
                ["Infra", "Docker + Compose + GitHub Actions + Nginx"],
                ["Cloud", "AWS (EC2/VPC/IAM/SG) — Enterprise는 회사별 전용 인프라"],
            ],
            col_widths=[30 * mm, 120 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("6.1 Knowledge 데이터 흐름 (암기)"))
    story.append(
        info_box(
            "Pipeline (순서 변경 금지)",
            "Upload → Parsing → Chunk → Embedding → VectorDB → Retrieval → "
            "Permission Check → LLM → Citation → Response → Audit Log",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("6.2 계층 규칙"))
    story.extend(
        bullets(
            [
                "Controller: 검증·인증 컨텍스트 추출, DTO 입출력만",
                "Service: 비즈니스 규칙, 트랜잭션, PermissionService 호출",
                "AI layer: 프롬프트·RAG·플래너 (도메인 권한 결정을 AI에 맡기지 말 것)",
                "Repository: workspace_id 조건 누락 금지",
                "FE: 서버 API만 호출, 시크릿·LLM 키 금지",
            ]
        )
    )

    # 7
    story.append(section_title("7", "보안·권한 불변식 (Invariants)"))
    story.append(
        P("아래는 테스트·리뷰에서 깨지면 머지/데모 불가인 규칙이다.")
    )
    story.append(
        make_table(
            ["ID", "불변식"],
            [
                ["INV-01", "모든 요청은 인증 + workspace 컨텍스트를 가진다 (공개 auth 제외)"],
                ["INV-02", "타 Workspace 리소스 ID 추측 접근 → 403 또는 404 (데이터 누수 0)"],
                ["INV-03", "RAG top-k raw 결과를 Permission Check 없이 LLM에 넣지 않는다"],
                ["INV-04", "AI 응답 JSON에 citations 필드 필수 (없으면 [] + 근거 부족 고지)"],
                ["INV-05", "Intern/NEW_HIRE는 고권한 문서(예: 연봉표) 내용 0 노출"],
                ["INV-06", "고객 문서로 LLM을 fine-tune/학습하지 않는다 (RAG only)"],
                ["INV-07", "AI 질의·권한 거부는 AuditLog에 남긴다"],
                ["INV-08", "비밀번호·API 키는 해시/서버 사이드만, FE 노출 금지"],
            ],
            col_widths=[22 * mm, 128 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("7.1 역할 코드"))
    story.append(P("OWNER · ADMIN · MANAGER · MEMBER · NEW_HIRE", "body_left"))

    # 8
    story.append(section_title("8", "도메인 모델 요약"))
    story.append(
        make_table(
            ["엔티티", "핵심 필드 / 메모"],
            [
                ["User", "id, email, name, passwordHash"],
                ["Workspace", "id, name, slug — 테넌트 경계"],
                ["Membership", "workspaceId, userId, role, status"],
                ["Invitation", "email, role, token, expiresAt, status"],
                ["Document", "workspaceId, title, storageKey, status(PENDING|PROCESSING|READY|FAILED), allowedRoles"],
                ["DocumentChunk", "documentId, workspaceId, content, embedding, chunkIndex"],
                ["OnboardingPlan", "workspaceId, userId, startDate, status, version"],
                ["OnboardingPlanItem", "dayIndex 1~30, type(DOCUMENT|PERSON|CHECKLIST|PRACTICE), status"],
                ["ChecklistItem", "userId, title, status, planItemId?"],
                ["ChatSession/Message", "workspaceId, userId, role, content, citations JSON"],
                ["AuditLog", "actorId, eventType, resource*, result, metadata — append-only"],
            ],
            col_widths=[42 * mm, 108 * mm],
        )
    )

    # 9
    story.append(section_title("9", "API 표면 요약"))
    story.append(
        P(
            "Base: /api/v1  |  Auth: Authorization: Bearer &lt;jwt&gt;  |  "
            "Workspace: X-Workspace-Id: &lt;uuid&gt;  |  상세는 API 명세서."
        )
    )
    story.append(
        make_table(
            ["그룹", "주요 엔드포인트"],
            [
                ["Auth", "POST /auth/signup|login|logout  GET /auth/me"],
                ["Workspace", "POST /workspaces  GET /workspaces/me  PATCH /workspaces/{id}"],
                ["Members", "POST /members/invitations  POST .../accept  GET /members  PATCH /members/{id}"],
                ["Documents", "POST/GET /documents  GET/DELETE /documents/{id}  POST .../reprocess"],
                ["Plans", "POST /onboarding-plans/generate  GET .../me  POST .../regenerate  PATCH .../items/{id}"],
                ["Today", "GET /recommendations/today  POST /recommendations/{id}/complete"],
                ["Checklist", "GET /checklists/me  PATCH /checklists/items/{itemId}"],
                ["Chat", "POST /chat/messages  GET /chat/sessions[/{id}]"],
                ["Dashboard", "GET /dashboard/me  GET /progress/me  GET /admin/progress[/{userId}]"],
                ["Admin", "GET /admin/audit-logs  Templates CRUD  GET /jobs/{id}"],
            ],
            col_widths=[28 * mm, 122 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.extend(
        bullets(
            [
                "공통 에러 JSON: timestamp, status, error, code, message, path, traceId",
                "목록: page(0-based), size, totalElements, totalPages, items[]",
                "Chat 성공 응답은 반드시 answer + citations[] 포함",
            ]
        )
    )

    # 10
    story.append(section_title("10", "바이브코딩 워크플로 (1기능=1프롬프트)"))
    story.append(subsection("10.1 세션 루프"))
    story.append(
        make_table(
            ["Step", "행동"],
            [
                ["1", "본 문서 + 해당 F-xx 기능명세 섹션 + 관련 API 엔드포인트 확인"],
                ["2", "작은 단위로 쪼갠다 (예: Document 엔티티+업로드 API 한 번에 하나)"],
                ["3", "구현 순서 고정: Frontend 골격 → Backend API → AI 연동 → 테스트"],
                ["4", "동작 확인 (curl/Swagger/브라우저) 후 다음 단위"],
                ["5", "DoD 체크 (권한·Citation·workspace 필터·Swagger)"],
            ],
            col_widths=[18 * mm, 132 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("10.2 PRD 개발 원칙 (준수)"))
    story.extend(
        bullets(
            [
                "1기능 = 1프롬프트 (과대 범위 금지)",
                "Frontend → Backend → AI → 테스트 순",
                "먼저 동작하는 MVP, 이후 폴리시 UI",
                "모든 API Swagger/OpenAPI",
                "모든 AI 응답 Citation + 권한 검증",
                "코드 생성 속도보다 아키텍처 일관성",
                "Enterprise SaaS로 확장 가능한 모듈 경계",
            ]
        )
    )

    # 11
    story.append(section_title("11", "구현 순서 (권장 로드맵)"))
    story.append(
        P("해커톤/바이브코딩 시 이 순서를 벗어나 예쁘 UI·고급 AI부터 하지 마라.")
    )
    story.append(
        make_table(
            ["#", "단위", "산출물"],
            [
                ["1", "모노레포 스캐폴드", "frontend/, backend/, docker-compose, README"],
                ["2", "Auth + JWT + /auth/me", "가입/로그인, 보호 API 401 검증"],
                ["3", "Workspace + Membership", "생성, X-Workspace-Id, 역할"],
                ["4", "Document upload + status", "Storage + PENDING 상태 머신"],
                ["5", "Ingest worker", "parse→chunk→embed→pgvector READY"],
                ["6", "Invite + NEW_HIRE 역할", "초대 수락, 멤버 목록"],
                ["7", "Onboarding Plan generate/me", "F-01 30일 항목 저장·조회"],
                ["8", "Recommendations/today", "F-02 대시보드 상단"],
                ["9", "Checklist toggle + progress", "F-04/F-05 진행률"],
                ["10", "Chat + Permission + Citation + Audit", "F-03/F-12 — 차별화 핵심"],
                ["11", "Admin 문서/멤버/진행 화면", "E2E 데모 플로우 연결"],
                ["12", "Swagger 정리 + 시나리오 테스트", "T-01~T-07 통과"],
            ],
            col_widths=[12 * mm, 55 * mm, 83 * mm],
        )
    )

    # 12
    story.append(section_title("12", "코딩 컨벤션"))
    story.append(subsection("12.1 Backend (Java/Spring)"))
    story.extend(
        bullets(
            [
                "패키지: {base}.domain|repository|service|web|ai|security|config",
                "REST: /api/v1/..., 복수 명사, UUID path variable",
                "검증: Bean Validation (@NotNull, @Email ...)",
                "예외: 공통 @ControllerAdvice → 표준 에러 JSON",
                "문서 상태 enum / 역할 enum 명확히",
                "AI 호출 타임아웃·재시도·로깅(traceId) 필수",
            ]
        )
    )
    story.append(subsection("12.2 Frontend (Next.js)"))
    story.extend(
        bullets(
            [
                "App Router, TypeScript strict",
                "UI: Tailwind + shadcn/ui",
                "서버 상태: fetch wrapper + 토큰/ workspace 헤더 자동 첨부",
                "신입 대시보드에 ‘오늘 할 일’을 최상단 고정",
                "Chat 메시지에 citation 칩 표시 (출처 없으면 명시)",
                "Empty state / loading / error 3종 처리",
            ]
        )
    )
    story.append(subsection("12.3 AI"))
    story.extend(
        bullets(
            [
                "프롬프트에 “근거 없는 사내 정보 단정 금지, citation 필수” 명시",
                "계획 생성 실패 시 템플릿 fallback",
                "모델/임베딩 제공자는 인터페이스 뒤로 (교체 가능)",
                "토큰 비용: 청크 수·히스토리 길이 제한",
            ]
        )
    )

    # 13
    story.append(section_title("13", "완료 정의 (Definition of Done)"))
    story.append(
        P("기능 하나를 “끝”이라고 말할 때 전부 만족해야 한다.")
    )
    story.append(
        make_table(
            ["#", "DoD 항목"],
            [
                ["1", "기능명세 수용 기준(AC) 충족"],
                ["2", "API 명세 path/필드와 정합 (또는 명세 동시 업데이트)"],
                ["3", "workspace 스코프 쿼리/테스트 존재"],
                ["4", "권한 케이스: 허용 + 거부 최소 1개씩"],
                ["5", "AI 기능이면 citations + audit 확인"],
                ["6", "Swagger에 엔드포인트 노출"],
                ["7", "FE에서 해피 패스 클릭 가능 (해당 화면 있을 때)"],
                ["8", "시크릿·키 커밋 없음"],
            ],
            col_widths=[12 * mm, 138 * mm],
        )
    )

    # 14
    story.append(section_title("14", "프롬프트 템플릿"))
    story.append(subsection("14.1 기능 구현 요청 시 (권장 포맷)"))
    story.append(
        P(
            "Context: OnboardOS — read AI_LEARN_FIRST.pdf principles.\n"
            "Feature: F-0X &lt;name&gt; (MVP)\n"
            "Scope: &lt;exactly one vertical slice&gt;\n"
            "Implement: Backend (Spring) [and/or] Frontend (Next.js)\n"
            "Constraints:\n"
            "- workspace isolation + RBAC\n"
            "- if AI: Permission Check before LLM + citations required\n"
            "- follow API paths in docs/OnboardOS_API_명세서.pdf\n"
            "- small diff, architecture consistency &gt; clever code\n"
            "DoD: AC from feature spec + swagger + happy path test\n"
            "Out of scope: &lt;explicitly list&gt;",
            "code",
        )
    )
    story.append(subsection("14.2 버그 수정 요청 시"))
    story.append(
        P(
            "Bug: &lt;symptom&gt;\n"
            "Expected: &lt;TTP/보안/명세 기준 기대 동작&gt;\n"
            "Repro: &lt;steps&gt;\n"
            "Likely area: &lt;module&gt;\n"
            "Check invariants INV-01~08 if security/RAG related.",
            "code",
        )
    )

    # 15
    story.append(section_title("15", "자주 하는 실수 (Anti-Patterns)"))
    story.append(
        make_table(
            ["안티패턴", "왜 나쁜가", "대신"],
            [
                ["Chat UI만 먼저 만들기", "RAG 챗봇으로 수렴", "대시보드+오늘 할 일+계획 먼저"],
                ["Retrieval 결과를 바로 LLM", "권한 누수", "Permission Filter 후 컨텍스트"],
                ["workspace_id 없는 쿼리", "테넌트 혼선", "모든 쿼리 필수 필터"],
                ["FE에서 OpenAI 호출", "키 노출·권한 우회", "Backend AI layer만"],
                ["MVP에 암묵지/멀티LLM", "범위 폭발", "Post-MVP 고정"],
                ["Citation 없는 답변", "신뢰·PRD 위반", "[] + 고지 또는 거부"],
                ["거대 PR 한 방", "리뷰·롤백 불가", "1기능=1슬라이스"],
                ["문서 무시하고 창작 API", "FE/BE 불일치", "API 명세 먼저 준수"],
            ],
            col_widths=[42 * mm, 48 * mm, 60 * mm],
        )
    )

    # 16
    story.append(section_title("16", "의사결정 트리"))
    story.append(
        make_table(
            ["질문", "Yes", "No"],
            [
                ["TTP를 높이는가?", "다음 질문", "구현하지 않음"],
                ["MVP 표에 있는가?", "구현", "Backlog / Phase 2+"],
                ["AI가 문서를 읽는가?", "Permission+Citation+Audit", "일반 CRUD 규칙만"],
                ["새 엔드포인트 필요?", "API 명세 형식 맞출 것", "기존 API 확장 검토"],
                ["FE에서 비밀 필요?", "절대 금지 → BE로", "OK"],
                ["해커톤 데모 경로인가?", "우선순위 상향", "뒤로"],
            ],
            col_widths=[50 * mm, 50 * mm, 50 * mm],
        )
    )

    # 17
    story.append(section_title("17", "체크리스트 (세션 시작/종료)"))
    story.append(subsection("17.1 세션 시작"))
    story.extend(
        bullets(
            [
                "□ AI_LEARN_FIRST.pdf 원칙 재확인 (TTP, 금지 형태, INV)",
                "□ 이번 슬라이스의 F-xx / API path 특정",
                "□ 현재 브랜치·dirty 상태 확인",
                "□ 로컬 실행 방법 파악 (docker-compose / bootRun / next dev)",
            ]
        )
    )
    story.append(subsection("17.2 세션 종료"))
    story.extend(
        bullets(
            [
                "□ DoD 8항 중 해당 항목 충족",
                "□ 권한 거부 시나리오 한 번이라도 확인 (AI/문서 관련 시)",
                "□ .env 시크릿 커밋 여부 확인",
                "□ 다음 슬라이스 한 줄로 README 또는 메모에 남김",
                "□ 명세와 코드 불일치 있으면 명세 또는 코드 중 하나를 즉시 맞출 것",
            ]
        )
    )

    story.append(section_title("18", "데모 시나리오 (항상 이 경로를 살릴 것)"))
    story.append(
        make_table(
            ["Step", "액터", "행동", "기대"],
            [
                ["1", "Admin", "가입 → Workspace 생성", "OWNER 멤버십"],
                ["2", "Admin", "온보딩 문서 업로드", "READY 상태"],
                ["3", "Admin", "신입 초대 (NEW_HIRE)", "초대 토큰"],
                ["4", "신입", "수락·로그인", "계획 생성 트리거"],
                ["5", "신입", "대시보드", "오늘 할 일 + 진행률"],
                ["6", "신입", "30일 계획 조회", "day 1~30 항목"],
                ["7", "신입", "허용 문서 질문", "answer + citations"],
                ["8", "신입", "권한 없는 문서 질문", "거부 + audit"],
                ["9", "신입", "체크리스트 완료", "진행률 상승"],
                ["10", "Admin", "진행 현황 확인", "신입 요약 표시"],
            ],
            col_widths=[12 * mm, 22 * mm, 50 * mm, 66 * mm],
        )
    )

    story.append(Spacer(1, 4 * mm))
    story.append(
        info_box(
            "최종 앵커 문장 — 모든 설계·코드 판단 기준",
            "우리는 챗봇을 만들지 않는다. 문서 검색기를 만들지 않는다. LMS를 만들지 않는다. "
            "우리는 신입이 독립적으로 성과를 내는 데 걸리는 시간(TTP)을 줄이는 "
            "AI Organizational Operating System을 만든다.",
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        P(
            "문서 재생성:  .venv/bin/python scripts/generate_docs.py  "
            "→ docs/*.pdf 및 루트 AI_LEARN_FIRST.pdf",
            "small",
        )
    )

    return story


# ===========================================================================
# 5. ERD (데이터 모델 · 제약 · 관계)
# ===========================================================================
def build_erd():
    story = []
    cover_page(
        story,
        "ERD / 데이터 모델 명세서",
        "Entity Relationship Diagram · Constraints · Indexes",
        "1.0",
        "Database ERD Specification",
        "Backend · DBA · AI 코딩 도구 · 보안 검토",
    )
    story.append(
        info_box(
            "SSOT",
            "상세 Markdown: docs/OnboardOS_ERD.md (Mermaid ERD · 샘플 DDL 포함). "
            "본 PDF는 구현·리뷰용 요약본이며, 컬럼 단위 풀스펙은 MD를 따른다. "
            "DBMS: PostgreSQL + pgvector. 불변식: Workspace Isolation · Soft delete · Audit append-only.",
        )
    )
    story.append(Spacer(1, 2 * mm))
    toc_block(
        story,
        [
            "개요 · 바운디드 컨텍스트",
            "엔티티 목록",
            "관계 · 카디널리티 · ON DELETE",
            "테이블 핵심 스키마",
            "제약조건 (PK/UK/FK/CHECK)",
            "Enum · 상태 전이",
            "인덱스 · 벡터 검색",
            "권한 모델과 스키마 연결",
            "멀티테넌시",
            "마이그레이션 순서",
            "API ↔ 테이블 매핑",
            "진행률 파생 규칙",
        ],
    )

    # 1
    story.append(section_title("1", "개요 · 바운디드 컨텍스트"))
    story.append(
        P(
            "OnboardOS 데이터 모델은 네 컨텍스트로 나뉜다. 모든 비즈니스 데이터(users 제외)는 "
            "workspace_id로 테넌트 격리된다."
        )
    )
    story.append(
        make_table(
            ["컨텍스트", "테이블", "역할"],
            [
                ["Identity & Access", "users, workspaces, memberships, invitations", "계정·테넌트·RBAC·초대"],
                ["Knowledge", "documents, document_chunks, templates*", "문서·임베딩·ACL·RAG"],
                ["Onboarding", "plans, plan_items, checklists, recommendations", "30일 계획·오늘 할 일·진행"],
                ["Conversation", "chat_sessions, chat_messages", "Citation 포함 대화"],
                ["Ops", "audit_logs, jobs", "감사·비동기 인제스트"],
            ],
            col_widths=[38 * mm, 55 * mm, 57 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "users ──┬── memberships ◄── workspaces ──┬── documents ── document_chunks(vector)\n"
            "         │                               ├── invitations / templates\n"
            "         │                               ├── onboarding_plans ── plan_items\n"
            "         │                               ├── checklist_items / daily_recommendations\n"
            "         │                               ├── chat_sessions ── chat_messages\n"
            "         │                               └── audit_logs / jobs",
            "code",
        )
    )

    # 2
    story.append(section_title("2", "엔티티 목록 (MVP 16)"))
    story.append(
        make_table(
            ["#", "테이블", "컨텍스트", "MVP"],
            [
                ["1", "users", "Identity", "Y"],
                ["2", "workspaces", "Identity", "Y"],
                ["3", "memberships", "Identity/RBAC", "Y"],
                ["4", "invitations", "Identity", "Y"],
                ["5", "documents", "Knowledge", "Y"],
                ["6", "document_chunks", "Knowledge/RAG", "Y"],
                ["7", "onboarding_templates", "Onboarding", "Partial"],
                ["8", "onboarding_template_items", "Onboarding", "Partial"],
                ["9", "onboarding_plans", "Onboarding", "Y"],
                ["10", "onboarding_plan_items", "Onboarding", "Y"],
                ["11", "checklist_items", "Onboarding", "Y"],
                ["12", "daily_recommendations", "Onboarding", "Y"],
                ["13", "chat_sessions", "Conversation", "Y"],
                ["14", "chat_messages", "Conversation", "Y"],
                ["15", "audit_logs", "Ops", "Y"],
                ["16", "jobs", "Ops", "Y"],
            ],
            col_widths=[12 * mm, 55 * mm, 50 * mm, 33 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("2.1 공통 컬럼 컨벤션"))
    story.append(
        make_table(
            ["컬럼", "타입", "규칙"],
            [
                ["id", "UUID PK", "gen_random_uuid()"],
                ["workspace_id", "UUID FK", "users 제외 거의 모든 테이블 필수"],
                ["created_at / updated_at", "TIMESTAMPTZ", "now() / 앱·트리거 갱신"],
                ["deleted_at", "TIMESTAMPTZ NULL", "NULL=활성 soft delete (audit 제외)"],
            ],
            col_widths=[45 * mm, 40 * mm, 65 * mm],
        )
    )

    # 3
    story.append(section_title("3", "관계 · 카디널리티 · ON DELETE"))
    story.append(
        make_table(
            ["부모", "자식", "관계", "ON DELETE", "메모"],
            [
                ["users", "memberships", "1:N", "RESTRICT", "N:M 해소 테이블"],
                ["workspaces", "memberships", "1:N", "RESTRICT", "테넌트 소속"],
                ["workspaces", "documents", "1:N", "RESTRICT", "soft delete 문서"],
                ["documents", "document_chunks", "1:N", "CASCADE", "청크는 문서 종속"],
                ["workspaces", "onboarding_plans", "1:N", "RESTRICT", ""],
                ["users", "onboarding_plans", "1:N", "RESTRICT", "신입 1인 활성 계획 1"],
                ["plans", "plan_items", "1:N", "CASCADE", "day_index 1~30"],
                ["documents", "plan_items", "1:N", "SET NULL", "문서 삭제 시 항목 유지"],
                ["plan_items", "checklist_items", "1:0..1", "SET NULL", "optional link"],
                ["users", "daily_recommendations", "1:N", "CASCADE soft", "date 단위"],
                ["users", "chat_sessions", "1:N", "RESTRICT", "본인만"],
                ["sessions", "chat_messages", "1:N", "CASCADE", "citations JSONB"],
                ["workspaces", "audit_logs", "1:N", "RESTRICT", "삭제 금지"],
                ["workspaces", "jobs", "1:N", "RESTRICT", "비동기 상태"],
                ["templates", "template_items", "1:N", "CASCADE", "Partial MVP"],
            ],
            col_widths=[32 * mm, 38 * mm, 18 * mm, 28 * mm, 34 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        warn_box(
            "비정규 workspace_id",
            "document_chunks, onboarding_plan_items, chat_messages 등은 부모에 workspace가 있어도 "
            "workspace_id를 중복 저장한다. 검색·감사·격리 필터 누락을 줄이기 위함. "
            "부모 workspace와 불일치 금지 (앱 또는 트리거 검증).",
        )
    )

    # 4
    story.append(section_title("4", "테이블 핵심 스키마"))
    story.append(subsection("4.1 Identity"))
    story.append(
        make_table(
            ["테이블", "핵심 컬럼", "핵심 제약"],
            [
                ["users", "email, name, password_hash, is_active", "UQ email (active)"],
                ["workspaces", "name, slug, settings JSONB", "UQ slug, slug regex"],
                [
                    "memberships",
                    "workspace_id, user_id, role, status, department, career_level, title",
                    "UQ (ws,user) active; role/status CHECK",
                ],
                [
                    "invitations",
                    "email, role, token, status, expires_at, invited_by, profile fields",
                    "UQ token; UQ (ws,email) WHERE PENDING",
                ],
            ],
            col_widths=[32 * mm, 70 * mm, 48 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("4.2 Knowledge"))
    story.append(
        make_table(
            ["테이블", "핵심 컬럼", "핵심 제약"],
            [
                [
                    "documents",
                    "title, storage_key, status, visibility, allowed_roles JSONB, chunk_count, uploaded_by",
                    "status/visibility CHECK; READY만 검색",
                ],
                [
                    "document_chunks",
                    "document_id, workspace_id, chunk_index, content, embedding vector(1536), metadata",
                    "UQ (document_id, chunk_index); CASCADE",
                ],
            ],
            col_widths=[35 * mm, 70 * mm, 45 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        info_box(
            "ACL",
            "visibility=WORKSPACE → ACTIVE membership 기본 허용. "
            "visibility=RESTRICTED → allowed_roles에 role 포함 시에만 허용. "
            "PermissionService가 RAG 직전 강제.",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("4.3 Onboarding"))
    story.append(
        make_table(
            ["테이블", "핵심 컬럼", "핵심 제약"],
            [
                [
                    "onboarding_plans",
                    "user_id, template_id?, status, version, start/end_date, progress_percent, generated_by",
                    "UQ ACTIVE (ws,user); progress 0~100",
                ],
                [
                    "onboarding_plan_items",
                    "day_index, type, title, status, sort_order, document_id?, person_*",
                    "day 1~30; type CHECK",
                ],
                [
                    "checklist_items",
                    "user_id, plan_item_id?, title, status, due_day, completed_at",
                    "PENDING|DONE",
                ],
                [
                    "daily_recommendations",
                    "recommend_date, type, title, status, priority, source, plan_item_id?, document_id?",
                    "IDX (ws,user,date)",
                ],
                [
                    "onboarding_templates(+items)",
                    "name, target_role / day_index, type, title",
                    "UQ (ws,name); day 1~30",
                ],
            ],
            col_widths=[42 * mm, 68 * mm, 40 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("4.4 Conversation · Ops"))
    story.append(
        make_table(
            ["테이블", "핵심 컬럼", "핵심 제약"],
            [
                ["chat_sessions", "workspace_id, user_id, title", "본인 세션만"],
                [
                    "chat_messages",
                    "session_id, role, content, citations JSONB, permission_denied_document_ids, model",
                    "role CHECK; assistant→citations 필수(앱)",
                ],
                [
                    "audit_logs",
                    "actor_id, event_type, resource_*, result, metadata, created_at",
                    "append-only; UPDATE/DELETE 금지",
                ],
                [
                    "jobs",
                    "type, status, progress, target_type/id, error_message, payload",
                    "progress 0~100",
                ],
            ],
            col_widths=[32 * mm, 78 * mm, 40 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("4.5 citations JSON 스키마"))
    story.append(
        P(
            '[{"documentId":"uuid","title":"배포 가이드","chunkId":"uuid","snippet":"...","page":3}]',
            "code",
        )
    )

    # 5
    story.append(section_title("5", "제약조건 총괄"))
    story.append(subsection("5.1 Unique"))
    story.append(
        make_table(
            ["이름", "테이블", "정의"],
            [
                ["UQ_users_email", "users", "email WHERE deleted_at IS NULL"],
                ["UQ_workspaces_slug", "workspaces", "slug"],
                ["UQ_memberships_ws_user", "memberships", "(workspace_id, user_id) active"],
                ["UQ_invitations_token", "invitations", "token"],
                ["UQ_invitations_pending", "invitations", "(ws, email) WHERE PENDING"],
                ["UQ_chunks_doc_idx", "document_chunks", "(document_id, chunk_index)"],
                ["UQ_active_plan", "onboarding_plans", "(ws, user_id) WHERE ACTIVE"],
                ["UQ_template_name", "templates", "(ws, name) active"],
            ],
            col_widths=[45 * mm, 40 * mm, 65 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("5.2 대표 FK ON DELETE"))
    story.append(
        make_table(
            ["자식.컬럼", "부모", "ON DELETE"],
            [
                ["document_chunks.document_id", "documents", "CASCADE"],
                ["plan_items.plan_id", "onboarding_plans", "CASCADE"],
                ["plan_items.document_id", "documents", "SET NULL"],
                ["chat_messages.session_id", "chat_sessions", "CASCADE"],
                ["template_items.template_id", "templates", "CASCADE"],
                ["audit_logs.workspace_id", "workspaces", "RESTRICT"],
                ["memberships.user_id", "users", "RESTRICT"],
            ],
            col_widths=[55 * mm, 45 * mm, 50 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("5.3 앱 레벨 제약 (DB만으로 부족)"))
    story.append(
        make_table(
            ["규칙", "강제 위치"],
            [
                ["RAG 전 Permission Check", "PermissionService"],
                ["계획에 권한 없는 document_id 미포함", "PlannerService"],
                ["Citation 필수 (빈 배열+고지 허용)", "ChatService"],
                ["활성 OWNER ≥ 1", "MembershipService"],
                ["progress_percent 재계산", "항목 완료 트랜잭션"],
                ["초대 만료 EXPIRED", "수락 시 검증 / 스케줄러"],
            ],
            col_widths=[75 * mm, 75 * mm],
        )
    )

    # 6
    story.append(section_title("6", "Enum · 상태 전이"))
    story.append(
        make_table(
            ["종류", "값"],
            [
                ["Role", "OWNER | ADMIN | MANAGER | MEMBER | NEW_HIRE"],
                ["PlanItemType", "DOCUMENT | PERSON | CHECKLIST | PRACTICE"],
                ["DocumentStatus", "PENDING | PROCESSING | READY | FAILED"],
                ["Plan status", "DRAFT | ACTIVE | COMPLETED | ARCHIVED"],
                ["Item status", "PENDING | DONE | SKIPPED (plan) / DISMISSED (reco)"],
                ["Invite status", "PENDING | ACCEPTED | EXPIRED | REVOKED"],
                ["Job status", "PENDING | PROCESSING | SUCCEEDED | FAILED"],
                ["Chat role", "user | assistant | system"],
                ["Audit result", "SUCCESS | DENIED | ERROR"],
            ],
            col_widths=[40 * mm, 110 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(subsection("6.1 Document 상태 전이"))
    story.append(
        info_box(
            "Pipeline",
            "PENDING → PROCESSING → READY  |  PROCESSING → FAILED → (reprocess) → PENDING. "
            "검색 조건: status=READY AND deleted_at IS NULL.",
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "PostgreSQL ENUM 타입 대신 VARCHAR + CHECK 권장 (마이그레이션 유연성). Java enum과 1:1 매핑."
        )
    )

    # 7
    story.append(section_title("7", "인덱스 · 벡터 검색"))
    story.append(
        make_table(
            ["인덱스", "목적"],
            [
                ["(workspace_id, status) on documents", "테넌트+상태 목록"],
                ["(workspace_id) on chunks", "격리 필터"],
                ["(document_id, chunk_index) UNIQUE", "청크 순서"],
                ["HNSW/IVFFlat on embedding", "벡터 유사도 검색"],
                ["(ws, user_id, recommend_date) on recommendations", "오늘 할 일"],
                ["(ws, created_at DESC) on audit_logs", "관리자 조회"],
                ["GIN(allowed_roles), GIN(citations)", "JSONB 검색"],
            ],
            col_widths=[70 * mm, 80 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "RAG 쿼리 골격:\n"
            "WHERE chunk.workspace_id = :ws AND d.status = 'READY' AND d.deleted_at IS NULL\n"
            "ORDER BY embedding <=> :q LIMIT :k\n"
            "→ 앱에서 documents.visibility / allowed_roles / membership.role 필터\n"
            "→ 통과 청크만 LLM → citations → audit_logs",
            "code",
        )
    )

    # 8
    story.append(section_title("8", "권한 모델과 스키마 연결"))
    story.append(
        make_table(
            ["단계", "데이터"],
            [
                ["1. 인증", "JWT → users.id"],
                ["2. 테넌트", "X-Workspace-Id → workspaces.id"],
                ["3. 인가(역할)", "memberships(user, ws, ACTIVE) → role"],
                ["4. 리소스 격리", "resource.workspace_id = ws"],
                ["5. 문서 ACL", "visibility + allowed_roles ∋ role"],
                ["6. AI", "chunks ⊆ ACL 통과분만 컨텍스트"],
            ],
            col_widths=[40 * mm, 110 * mm],
        )
    )

    # 9
    story.append(section_title("9", "멀티테넌시"))
    story.append(
        make_table(
            ["단계", "패턴"],
            [
                ["MVP", "Shared DB + logical isolation (workspace_id 필수 필터)"],
                ["강화(선택)", "PostgreSQL RLS: app.workspace_id 세션 변수"],
                ["Enterprise", "Dedicated DB/VPC — 스키마 동일, 커넥션 라우팅 분리"],
            ],
            col_widths=[35 * mm, 115 * mm],
        )
    )

    # 10
    story.append(section_title("10", "마이그레이션 순서"))
    story.append(
        make_table(
            ["Order", "내용"],
            [
                ["V1", "extensions: pgcrypto, vector"],
                ["V2–V5", "users → workspaces → memberships → invitations"],
                ["V6–V7", "documents → document_chunks (+ vector index)"],
                ["V8–V11", "templates → plans/items → checklists → recommendations"],
                ["V12–V14", "chat_* → audit_logs → jobs"],
                ["V15", "보조 인덱스 · updated_at 트리거"],
            ],
            col_widths=[25 * mm, 125 * mm],
        )
    )
    story.append(Spacer(1, 2 * mm))
    story.append(
        P(
            "초대 수락 트랜잭션: invitation ACCEPTED → membership INSERT → "
            "(optional) PLAN_GENERATE job. 상세 DDL 스케치는 docs/OnboardOS_ERD.md §10."
        )
    )

    # 11
    story.append(section_title("11", "API ↔ 테이블 매핑"))
    story.append(
        make_table(
            ["API 그룹", "테이블"],
            [
                ["/auth/*", "users, memberships"],
                ["/workspaces/*", "workspaces, memberships"],
                ["/members/*", "memberships, invitations"],
                ["/documents/*", "documents, document_chunks, jobs"],
                ["/onboarding-plans/*", "onboarding_plans, onboarding_plan_items"],
                ["/recommendations/*", "daily_recommendations"],
                ["/checklists/*", "checklist_items"],
                ["/chat/*", "chat_sessions, chat_messages, audit_logs"],
                ["/dashboard/me, /progress/*", "plans, items, reco, checklists 집계"],
                ["/admin/audit-logs", "audit_logs"],
                ["/templates/*", "onboarding_templates, items"],
                ["/jobs/*", "jobs"],
            ],
            col_widths=[55 * mm, 95 * mm],
        )
    )

    # 12
    story.append(section_title("12", "진행률 파생 규칙"))
    story.append(
        P(
            "plan.progress_percent = 100 * count(DONE) / nullif(count(status <> SKIPPED), 0)\n"
            "checklist progress = 100 * done / total (deleted_at IS NULL)\n"
            "소스 오브 트루스 = item.status / checklist.status  |  progress_percent 는 캐시 컬럼",
            "code",
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        info_box(
            "앵커",
            "스키마의 모든 workspace_id와 documents.allowed_roles / visibility 필드는 "
            "「AI도 사람의 문서 권한을 그대로 따른다」는 PRD 원칙을 데이터 모델로 구현하기 위한 것이다. "
            "풀 컬럼 정의·Mermaid·샘플 DDL → docs/OnboardOS_ERD.md",
        )
    )
    return story


# ===========================================================================
# Build all
# ===========================================================================
def write_pdf(filename: str, title: str, story_builder, out_dir=None):
    target_dir = Path(out_dir) if out_dir else OUT_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / filename
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        title=title,
        author="OnboardOS Team",
    )
    story = story_builder()
    doc.build(
        story,
        onFirstPage=lambda c, d: add_page_number(c, d, title),
        onLaterPages=lambda c, d: add_page_number(c, d, title),
    )
    print(f"Wrote {path} ({path.stat().st_size} bytes)")
    return path


def main():
    paths = [
        # 루트: CLI/AI가 디렉토리 열자마자 발견
        write_pdf("AI_LEARN_FIRST.pdf", "AI LEARN FIRST", build_ai_learn, out_dir=ROOT),
        # docs 복사본 (문서 세트 일관성)
        write_pdf("00_AI_LEARN_FIRST.pdf", "AI LEARN FIRST", build_ai_learn, out_dir=OUT_DIR),
        write_pdf("OnboardOS_상세_PRD.pdf", "상세 PRD", build_prd),
        write_pdf("OnboardOS_기능명세서.pdf", "기능명세서", build_feature_spec),
        write_pdf("OnboardOS_API_명세서.pdf", "API 명세서", build_api_spec),
        write_pdf("OnboardOS_ERD.pdf", "ERD", build_erd),
    ]
    print("Done:", paths)


if __name__ == "__main__":
    main()
