-- Recria as RPCs de contagem de questões como queries diretas (sem cache/view materializada)
-- Rodar no Supabase Dashboard > SQL Editor

-- 1. Contagem por tópico
CREATE OR REPLACE FUNCTION get_question_counts_by_topic()
RETURNS TABLE(topic_id text, question_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT "topicId"::text AS topic_id, COUNT(*)::bigint AS question_count
  FROM "Question"
  WHERE aprovado = true
  GROUP BY "topicId";
$$;

-- 2. Contagem por matéria
CREATE OR REPLACE FUNCTION get_question_counts_by_subject()
RETURNS TABLE(subject_id text, question_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT "subjectId"::text AS subject_id, COUNT(*)::bigint AS question_count
  FROM "Question"
  WHERE aprovado = true
  GROUP BY "subjectId";
$$;
