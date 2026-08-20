-- 같은 계획 항목에 대한 오늘의 추천이 동시 요청으로 두 번 만들어지는 것을 막는다.
-- plan_item_id 가 없는 폴백 추천(NULL)은 유니크 검사에서 자동으로 제외된다.
CREATE UNIQUE INDEX uq_daily_reco_plan_item_day
    ON daily_recommendations (workspace_id, user_id, recommend_date, plan_item_id)
    WHERE plan_item_id IS NOT NULL;
