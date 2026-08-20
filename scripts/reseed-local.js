#!/usr/bin/env node
/**
 * 로컬 개발 DB 초기화 + 실제 API 플로우로 시드 데이터 재구성.
 *
 * 왜 필요한가:
 *   기존 로컬 데이터는 SQL 로 직접 INSERT 된 것이어서
 *     - onboarding_plans.progress_percent 가 서버 계산식과 어긋나 있었고 (36.00 vs 36.36)
 *     - documents 의 실제 파일이 스토리지에 없어 재처리가 불가능했고
 *     - document_chunks.embedding 이 전부 NULL 이라 벡터 검색이 동작하지 않았다.
 *   이 스크립트는 같은 데이터를 "서버 API 를 실제로 호출해서" 만든다.
 *   따라서 진행률·체크리스트·임베딩·감사 로그가 모두 서버가 계산한 값이 된다.
 *
 * 사용법:
 *   node scripts/reseed-local.js --yes          # 전체 초기화 후 재구성
 *   node scripts/reseed-local.js --verify-only  # 삭제 없이 현재 상태만 점검
 *
 * 전제:
 *   1) 백엔드가 실행 중 (기본 http://localhost:8080)
 *   2) 로컬 PostgreSQL 접속 가능 (BE/.env 의 DB_* 값 사용)
 *   3) OPENAI_API_KEY 가 설정돼 있으면 업로드 시 실제 임베딩까지 생성된다
 *
 * 주의: users 테이블까지 비우므로 기존 로그인 계정이 사라진다.
 *       아래 PASSWORD 값으로 계정이 다시 만들어진다.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------
// 설정
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const ASSET_DIR = path.join(__dirname, 'seed-assets');

const API_ROOT = (process.env.API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const API = `${API_ROOT}/api/v1`;

/** 시드 계정 공통 비밀번호 (서버 정책: 8자 이상) */
const PASSWORD = process.env.SEED_PASSWORD || 'Onboard!2026';

/**
 * 소유자만 실제 주소를 쓴다 (로그인해서 화면을 봐야 하므로).
 * 팀원은 RFC 2606 예약 도메인 example.com 을 써서 메일이 실제로 배달되지 않게 한다.
 */
const OWNER = { email: 'ssongsyj@naver.com', name: '송하성' };

const MEMBERS = [
  { email: 'daeun.jung@example.com', name: '정다은', role: 'ADMIN', department: '경영지원팀', title: '총무 팀장', careerLevel: 'SENIOR' },
  { email: 'minsoo.lee@example.com', name: '이민수', role: 'MANAGER', department: '개발팀', title: '시니어 엔지니어', careerLevel: 'SENIOR' },
  { email: 'seoyeon.choi@example.com', name: '최서연', role: 'MEMBER', department: '프로덕트팀', title: '프로덕트 매니저', careerLevel: 'MID' },
  { email: 'junhyuk.park@example.com', name: '박준혁', role: 'NEW_HIRE', department: '마케팅팀', title: '주니어 마케터', careerLevel: 'JUNIOR' },
];

const WORKSPACE = { name: '온보딩팀', slug: 'onboard' };

/** 업로드할 문서. 보안 가이드만 역할 제한을 걸어 실제 접근 거부 로그가 남게 한다 */
const DOCUMENTS = [
  { file: '2026_온보딩_가이드_및_사내규정.pdf', visibility: 'WORKSPACE' },
  { file: '신규입사자_30일_업무_매뉴얼.pdf', visibility: 'WORKSPACE' },
  { file: '2026년도_1분기_마케팅_전략기획서.pdf', visibility: 'WORKSPACE' },
  {
    file: '사내_보안_및_데이터접근_가이드라인.pdf',
    visibility: 'RESTRICTED',
    allowedRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },
];

const TEMPLATES = [
  {
    name: '마케팅 신입 30일 온보딩',
    targetRole: 'NEW_HIRE',
    description: '마케팅팀 신입 구성원이 30일 안에 독립 업무까지 도달하도록 구성한 기본 템플릿입니다.',
    isDefault: true,
    items: [
      { dayIndex: 1, type: 'DOCUMENT', title: '회사 기본 규칙 및 온보딩 가이드 숙지', description: '근태·업무 도구·보고 체계 확인', sortOrder: 0 },
      { dayIndex: 1, type: 'PERSON', title: '팀원 및 멘토와의 첫 미팅', description: '30일 목표 합의', sortOrder: 1 },
      { dayIndex: 2, type: 'CHECKLIST', title: '업무 툴 계정 발급 확인', description: 'Slack·Jira·GitHub·Notion 접속 확인', sortOrder: 0 },
      { dayIndex: 3, type: 'CHECKLIST', title: '사내 Wi-Fi 및 VPN 설치', description: '보안 프로그램 설치 후 접속 테스트', sortOrder: 0 },
      { dayIndex: 4, type: 'DOCUMENT', title: '1분기 마케팅 전략기획서 검토', description: '분기 목표와 예산 배분 파악', sortOrder: 0 },
      { dayIndex: 5, type: 'PERSON', title: '1주차 온보딩 피드백 미팅', description: '멘토와 1주차 회고', sortOrder: 0 },
      { dayIndex: 8, type: 'PRACTICE', title: '첫 캠페인 초안 작성', description: '기존 캠페인을 참고해 초안 작성', sortOrder: 0 },
      { dayIndex: 12, type: 'CHECKLIST', title: '주간 보고 양식 작성 연습', description: '주간 보고 페이지에 시범 작성', sortOrder: 0 },
      { dayIndex: 15, type: 'PERSON', title: '2주차 중간 점검', description: '팀 리드와 진행 상황 점검', sortOrder: 0 },
      { dayIndex: 22, type: 'PRACTICE', title: '담당 채널 단독 운영', description: '소셜 채널 한 개를 단독으로 운영', sortOrder: 0 },
      { dayIndex: 30, type: 'PERSON', title: '30일 온보딩 완료 리뷰', description: '최종 리뷰 발표 및 회고 작성', sortOrder: 0 },
    ],
  },
  {
    name: '경력 입사자 2주 적응 과정',
    targetRole: 'MEMBER',
    description: '경력 입사자가 2주 안에 담당 업무를 인수하도록 구성한 압축 템플릿입니다.',
    isDefault: false,
    items: [
      { dayIndex: 1, type: 'DOCUMENT', title: '사내 규정 및 보안 가이드 확인', description: '데이터 등급과 접근 권한 이해', sortOrder: 0 },
      { dayIndex: 2, type: 'PERSON', title: '인수인계 담당자 미팅', description: '담당 업무 범위 확인', sortOrder: 0 },
      { dayIndex: 4, type: 'PRACTICE', title: '기존 업무 프로세스 재현', description: '인수받은 절차를 직접 수행', sortOrder: 0 },
      { dayIndex: 7, type: 'CHECKLIST', title: '1주차 인수 항목 점검', description: '누락 항목 확인', sortOrder: 0 },
      { dayIndex: 10, type: 'PRACTICE', title: '담당 업무 단독 수행', description: '지원 없이 한 사이클 수행', sortOrder: 0 },
      { dayIndex: 14, type: 'PERSON', title: '인수인계 완료 확인', description: '담당자와 최종 확인', sortOrder: 0 },
    ],
  },
];

/** 신입이 실제로 완료 처리할 계획 항목 (dayIndex 기준) */
const COMPLETE_PLAN_DAYS = [1, 2, 3];

/** 신입이 던질 AI 질문 */
const QUESTIONS = [
  '연차는 며칠 주어지고 재택근무는 몇 번 가능해?',
  '1분기 마케팅 예산은 얼마이고 어디에 가장 많이 쓰여?',
  '기밀 등급 문서는 누가 볼 수 있어?',
];

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const CONFIRMED = args.includes('--yes');
const VERIFY_ONLY = args.includes('--verify-only');

let step = 0;
const log = (msg) => console.log(msg);
const head = (msg) => console.log(`\n[${++step}] ${msg}`);
const ok = (msg) => console.log(`    OK  ${msg}`);
const warn = (msg) => console.log(`    !!  ${msg}`);

function fail(msg) {
  console.error(`\n실패: ${msg}`);
  process.exit(1);
}

/** BE/.env 를 읽어 DB 접속 정보를 얻는다 */
function loadDbEnv() {
  const envPath = path.join(ROOT, 'BE', '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  }
  return {
    host: process.env.DB_HOST || env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || env.DB_PORT || '5432',
    name: process.env.DB_NAME || env.DB_NAME || 'onboarding',
    user: process.env.DB_USERNAME || env.DB_USERNAME || 'onboarding',
    password: process.env.DB_PASSWORD || env.DB_PASSWORD || 'onboarding',
  };
}

const DB = loadDbEnv();

/** psql 실행 파일 찾기 */
function findPsql() {
  if (process.env.PSQL) return process.env.PSQL;
  const candidates = [];
  for (const version of ['17', '16', '15', '14']) {
    candidates.push(`C:/Program Files/PostgreSQL/${version}/bin/psql.exe`);
  }
  candidates.push('psql');
  for (const c of candidates) {
    if (c === 'psql' || fs.existsSync(c)) return c;
  }
  fail('psql 실행 파일을 찾을 수 없습니다. PSQL 환경변수로 경로를 지정해 주세요.');
}

const PSQL = findPsql();

/** SQL 을 실행하고 결과를 문자열로 돌려준다 (-A -t: 구분자 없는 값만) */
function sql(query, { raw = false } = {}) {
  const flags = raw ? [] : ['-A', '-t'];
  return execFileSync(
    PSQL,
    ['-h', DB.host, '-p', DB.port, '-U', DB.user, '-d', DB.name, ...flags, '-v', 'ON_ERROR_STOP=1', '-c', query],
    { env: { ...process.env, PGPASSWORD: DB.password, PGCLIENTENCODING: 'UTF8' }, encoding: 'utf8' }
  ).trim();
}

/** REST 호출. 실패하면 서버 메시지를 그대로 올린다 */
async function call(method, endpoint, { token, workspaceId, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (workspaceId) headers['X-Workspace-Id'] = workspaceId;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API}${endpoint}`, {
    method,
    headers,
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  });

  const text = await response.text();
  const parsed = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!response.ok) {
    const detail = parsed && typeof parsed === 'object' ? parsed.message ?? JSON.stringify(parsed) : parsed;
    throw new Error(`${method} ${endpoint} -> ${response.status} ${detail}`);
  }
  return parsed;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// 1. 초기화
// ---------------------------------------------------------------------------
function truncateAll() {
  const tables = sql(`
    select string_agg(format('%I.%I', table_schema, table_name), ', ')
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name <> 'flyway_schema_history';
  `);
  if (!tables) fail('비울 테이블을 찾지 못했습니다. 마이그레이션이 적용된 DB인지 확인해 주세요.');

  sql(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);
  ok(`테이블 비움: ${tables.split(', ').length}개 (flyway_schema_history 유지)`);
}

/** 로컬 스토리지에 남은 파일도 지운다 (DB 를 비우면 참조가 사라지므로) */
function clearStorage() {
  const dir = path.join(ROOT, 'BE', 'storage');
  if (!fs.existsSync(dir)) {
    ok('BE/storage 없음 (지울 파일 없음)');
    return;
  }
  let removed = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        fs.rmdirSync(full);
      } else {
        fs.unlinkSync(full);
        removed++;
      }
    }
  };
  walk(dir);
  ok(`스토리지 파일 삭제: ${removed}개`);
}

// ---------------------------------------------------------------------------
// 2. 계정 (signup -> DB 에서 인증코드 -> verify -> login)
// ---------------------------------------------------------------------------
async function createAccount({ email, name }) {
  await call('POST', '/auth/signup', { body: { email, password: PASSWORD, name } });

  // 인증 코드는 메일로도 나가지만, 스크립트는 DB 에 저장된 값을 읽어 그대로 인증한다
  const code = sql(
    `select code from email_verification_codes where lower(email) = lower('${email}') order by created_at desc limit 1;`
  );
  if (!code) fail(`${email} 의 인증 코드를 DB 에서 찾지 못했습니다.`);

  await call('POST', '/auth/verify-email', { body: { email, code } });
  const auth = await call('POST', '/auth/login', { body: { email, password: PASSWORD } });
  ok(`${name} <${email}> 가입·인증·로그인 완료`);
  return { token: auth.accessToken, userId: auth.userId, email, name };
}

// ---------------------------------------------------------------------------
// 3. 문서 업로드 (실제 PDF 멀티파트)
// ---------------------------------------------------------------------------
async function uploadDocument(owner, workspaceId, doc) {
  const filePath = path.join(ASSET_DIR, doc.file);
  if (!fs.existsSync(filePath)) fail(`시드 PDF 가 없습니다: ${filePath}`);

  const query = new URLSearchParams({ title: doc.file, visibility: doc.visibility });
  if (doc.allowedRoles?.length) query.set('allowedRoles', doc.allowedRoles.join(','));

  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(filePath)], { type: 'application/pdf' }), doc.file);

  // 업로드는 동기 인제스트다: PDF 텍스트 추출 + 청킹 + (키가 있으면) 임베딩까지 끝나고 응답한다
  const result = await call('POST', `/documents?${query}`, { token: owner.token, workspaceId, form });
  ok(`${doc.file} -> ${result.status}, 청크 ${result.chunkCount ?? 0}개`);
  return result;
}

// ---------------------------------------------------------------------------
// 4. 검증
// ---------------------------------------------------------------------------
function verify() {
  head('최종 검증');

  const rows = sql(`
    select table_name || '=' || (xpath('/row/c/text()',
      query_to_xml(format('select count(*) c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
    from information_schema.tables
    where table_schema='public' and table_type='BASE TABLE' and table_name <> 'flyway_schema_history'
    order by table_name;
  `);
  log('    행 수:');
  for (const line of rows.split('\n').filter(Boolean)) log(`      ${line.trim()}`);

  // 진행률이 서버 계산식과 일치하는지 (예전 시드의 36.00 vs 36.36 문제)
  // 주의: Windows 에서 psql -c 인자에 한글을 넣으면 인코딩이 깨지므로 SQL 은 ASCII 로만 쓴다
  const progress = sql(`
    select p.progress_percent::text || '|' ||
           coalesce(round(count(*) filter (where i.status='DONE') * 100.0
                    / nullif(count(*) filter (where i.status <> 'SKIPPED'), 0), 2)::text, '-')
    from onboarding_plans p left join onboarding_plan_items i on i.plan_id = p.id
    group by p.id, p.progress_percent;
  `);
  if (!progress) {
    log('    진행률: (계획 없음)');
  } else {
    for (const line of progress.split('\n').filter(Boolean)) {
      const [stored, recomputed] = line.trim().split('|');
      const match = Number(stored) === Number(recomputed) ? '일치' : '불일치';
      log(`    진행률 저장값 ${stored}% / 재계산값 ${recomputed}% -> ${match}`);
    }
  }

  const embed = sql(`select count(*)::text || ' / ' || count(embedding)::text from document_chunks;`);
  log(`    문서 청크(전체 / 임베딩 보유): ${embed}`);

  const storageDir = path.join(ROOT, 'BE', 'storage');
  let files = 0;
  if (fs.existsSync(storageDir)) {
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(path.join(d, e.name));
        else files++;
      }
    };
    walk(storageDir);
  }
  log(`    스토리지 실제 파일: ${files}개`);

  const audits = sql(
    `select event_type || ' ' || result || ' x' || count(*)::text
     from audit_logs group by event_type, result order by event_type, result;`
  );
  log('    감사 로그:');
  for (const line of (audits || '(없음)').split('\n').filter(Boolean)) log(`      ${line.trim()}`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
(async () => {
  log('OnboardOS 로컬 시드 재구성');
  log(`  API : ${API}`);
  log(`  DB  : ${DB.user}@${DB.host}:${DB.port}/${DB.name}`);
  log(`  psql: ${PSQL}`);

  head('사전 점검');
  const health = await call('GET', '/health').catch(() => null);
  if (!health) fail(`백엔드에 연결할 수 없습니다: ${API}/health`);
  ok(`백엔드 응답: ${JSON.stringify(health)}`);
  ok(`DB 연결: ${sql('select current_database();')}`);

  if (VERIFY_ONLY) {
    verify();
    return;
  }

  if (!CONFIRMED) {
    log('\n이 스크립트는 아래 DB 의 모든 테이블을 비웁니다 (flyway_schema_history 제외).');
    log(`  ${DB.user}@${DB.host}:${DB.port}/${DB.name}`);
    log('기존 로그인 계정도 사라집니다. 실행하려면 --yes 를 붙여 주세요.');
    process.exit(1);
  }

  head('DB 및 스토리지 초기화');
  truncateAll();
  clearStorage();

  head('소유자 계정 생성');
  const owner = await createAccount(OWNER);

  head('워크스페이스 생성');
  const workspace = await call('POST', '/workspaces', { token: owner.token, body: WORKSPACE });
  const wsId = workspace.id;
  ok(`${workspace.name} (${workspace.slug}) ${wsId}`);

  head('온보딩 템플릿 생성');
  const createdTemplates = [];
  for (const template of TEMPLATES) {
    const created = await call('POST', '/templates', { token: owner.token, workspaceId: wsId, body: template });
    createdTemplates.push(created);
    ok(`${created.name} (항목 ${created.items?.length ?? 0}개)`);
  }

  head('문서 업로드 (실제 PDF · 동기 인제스트)');
  for (const doc of DOCUMENTS) await uploadDocument(owner, wsId, doc);

  head('팀원 계정 생성 및 초대 수락');
  const joined = [];
  for (const member of MEMBERS) {
    const account = await createAccount(member);
    const invitation = await call('POST', '/members/invitations', {
      token: owner.token,
      workspaceId: wsId,
      body: {
        email: member.email,
        role: member.role,
        department: member.department,
        careerLevel: member.careerLevel,
        title: member.title,
      },
    });
    const accepted = await call('POST', `/members/invitations/${invitation.token}/accept`, { token: account.token });
    ok(`${member.name} ${member.role} 초대 수락 (계획 ${accepted.onboardingPlanId ? '자동 생성' : '없음'})`);
    joined.push({ ...account, ...member, planId: accepted.onboardingPlanId });
  }

  const newHire = joined.find((m) => m.role === 'NEW_HIRE');
  if (!newHire) fail('NEW_HIRE 계정을 만들지 못했습니다.');

  head('신입 계획 확인');
  /*
   * 초대를 수락하는 순간 서버가 계획을 자동 생성한다.
   * 이때 templateId 를 넘기지 않으므로 TemplateService.loadItemsForPlan 이
   * 워크스페이스의 isDefault 템플릿을 찾아 쓴다. 위에서 첫 템플릿을 isDefault=true 로
   * 만들었기 때문에 이미 커스텀 템플릿 기준으로 생성돼 있다.
   *
   * 참고: POST /onboarding-plans/generate 로 force=true 재생성을 하면 500 이 난다.
   *   uq_active_plan UNIQUE (workspace_id, user_id) WHERE status='ACTIVE' 인 상태에서
   *   기존 계획을 ARCHIVED 로 바꾸는 UPDATE 보다 새 ACTIVE 계획 INSERT 가 먼저 flush 되어
   *   유니크 제약을 위반한다. BE 수정 전까지 이 경로는 쓰지 않는다.
   */
  const plan = await call('GET', '/onboarding-plans/me?includeItems=true', {
    token: newHire.token,
    workspaceId: wsId,
  });
  ok(`계획 ${plan.planId} · 항목 ${plan.itemCount}개 · ${plan.startDate} ~ ${plan.endDate}`);
  ok(`사용된 템플릿: ${createdTemplates[0].name} (isDefault)`);

  head('오늘 할 일 생성 (조회 시 서버가 만든다)');
  const today = await call('GET', '/recommendations/today', { token: newHire.token, workspaceId: wsId });
  ok(`${today.date} 추천 ${today.items.length}건`);

  head('계획 항목 완료 처리 (진행률은 서버가 계산)');
  const target = (plan.items ?? []).filter((item) => COMPLETE_PLAN_DAYS.includes(item.dayIndex));
  for (const item of target) {
    await call('PATCH', `/onboarding-plans/items/${item.id}`, {
      token: newHire.token,
      workspaceId: wsId,
      body: { status: 'DONE' },
    });
  }
  ok(`${target.length}개 항목 DONE 처리`);

  head('체크리스트 일부 완료');
  const checklist = await call('GET', '/checklists/me?status=ALL', { token: newHire.token, workspaceId: wsId });
  const pending = checklist.items.filter((item) => item.status !== 'DONE');
  for (const item of pending.slice(0, 1)) {
    await call('PATCH', `/checklists/items/${item.id}`, {
      token: newHire.token,
      workspaceId: wsId,
      body: { status: 'DONE' },
    });
  }
  const afterChecklist = await call('GET', '/checklists/me?status=ALL', { token: newHire.token, workspaceId: wsId });
  ok(`체크리스트 ${afterChecklist.done}/${afterChecklist.total} (${afterChecklist.progressPercent}%)`);

  head('오늘 할 일 일부 완료');
  // 대시보드에 진행 중인 항목이 보이도록 한 건은 PENDING 으로 남긴다
  const doneTargets = today.items.filter((item) => item.status === 'PENDING').slice(0, -1);
  for (const item of doneTargets) {
    await call('POST', `/recommendations/${item.id}/complete`, { token: newHire.token, workspaceId: wsId });
  }
  ok(`추천 ${doneTargets.length}건 완료 처리`);

  head('AI 질문 (실제 RAG · 감사 로그 생성)');
  let sessionId;
  for (const question of QUESTIONS) {
    const answer = await call('POST', '/chat/messages', {
      token: newHire.token,
      workspaceId: wsId,
      body: sessionId ? { message: question, sessionId } : { message: question },
    });
    sessionId = answer.sessionId;
    const denied = answer.permissionDeniedDocumentIds?.length ?? 0;
    ok(`"${question}" -> 출처 ${answer.citations?.length ?? 0}건${denied ? `, 권한 거부 ${denied}건` : ''}`);
    await sleep(300);
  }

  head('관리자 화면용 데이터 확인');
  const adminProgress = await call('GET', '/admin/progress?page=0&size=20', { token: owner.token, workspaceId: wsId });
  for (const row of adminProgress.items) {
    ok(`${row.name} ${row.currentDay}일차 ${row.progressPercent}% ${row.status}`);
  }

  verify();

  log('\n완료. 로그인 정보:');
  log(`  소유자  ${OWNER.email} / ${PASSWORD}`);
  for (const member of MEMBERS) log(`  ${member.role.padEnd(9)} ${member.email} / ${PASSWORD}`);
})().catch((error) => {
  console.error(`\n오류: ${error.message}`);
  process.exit(1);
});
