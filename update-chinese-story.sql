-- Update existing story to Chinese
UPDATE stories 
SET content = '深夜的地铁站里，她看见了一个不该存在的人。'
WHERE is_active = true;

-- If no active story exists, create one
INSERT INTO stories (content, is_active) 
SELECT '深夜的地铁站里，她看见了一个不该存在的人。', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE is_active = true);