import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// This endpoint can be called by a cron job or manually
export async function POST() {
  try {
    // Check if AI key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY not configured");
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    // Initialize OpenRouter with Gemini 2.5 Flash
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // Check current active story
    const { data: activeStory } = await supabase
      .from("stories")
      .select("*")
      .eq("is_active", true)
      .single();

    if (!activeStory) {
      // Create new story with strong hook
      const { text } = await generateText({
        model: openrouter("google/gemini-2.5-flash"),
        prompt: `创作一个极具冲击力的中文小说开头句子，必须包含强烈的HOOK元素：

核心要求：
1. 必须是中文，文字优美但具有强烈冲击力
2. 长度在30-50个汉字之间
3. 开头必须立即抓住读者注意力，让人忍不住想继续阅读
4. 甜中带苦，情感张力巨大，足够"刀人"
5. 用中文句号。结尾
6. 只返回一个句子，不要其他内容

HOOK技巧（必须使用其中至少2个）：
- 悬念/谜团：留下让人好奇的信息缺失
- 冲突/矛盾：展现强烈的情感或情境对比  
- 时间跳跃：暗示过去和现在的关联
- 意外信息：透露出人意料的关键细节
- 情感炸弹：瞬间击中读者情感痛点
- 生死关头：涉及生命、离别、失去

优秀开头示例（参考这种冲击力）：
- 她在婚礼前一夜收到了他寄来的最后一封信，信封上还残留着三年前的邮戳。
- 医生说她只剩三个月生命的那天，正好是他们约定结婚的日期。
- 他删除了所有关于她的照片，却发现手机里还有一条未发出的求婚短信。
- 火化场的工作人员说，这是他见过最年轻的新娘。
- 她终于等到了他的电话，却是他妻子打来告诉她他已经去世的消息。

创作要求：
- 情感冲击力要比示例更强
- 必须让读者产生"这是什么情况？"的强烈好奇心
- 甜蜜与痛苦的对比要极其强烈
- 要有让人心碎的美感`,
        temperature: 0.95,
        maxTokens: 150,
      });

      // Create new story
      const { error } = await supabase.from("stories").insert({
        content: text,
        is_active: true,
      });

      if (error) {
        console.error("Error creating story:", error);
        return NextResponse.json(
          { error: "Failed to create story" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, story: text });
    }

    // Check if story has been inactive for 1 hour
    const { data: recentSubmissions } = await supabase
      .from("submissions")
      .select("*")
      .eq("story_id", activeStory.id)
      .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1);

    if (!recentSubmissions || recentSubmissions.length === 0) {
      // No submissions in the last hour, generate AI continuation
      const { text } = await generateText({
        model: openrouter("google/gemini-2.5-flash"),
        prompt: `继续这个唯美的中文小说，当前内容是："${activeStory.content}"
        
要求：
1. 必须用中文续写，保持唯美文艺风格
2. 只写一个句子，长度在25-45个汉字之间
3. 要承接上文，推进故事发展
4. 保持甜中带苦、刀人的情感张力
5. 用中文句号。结尾
6. 只返回续写的句子，不要其他内容

续写风格：
- 延续唯美浪漫但悲伤的基调
- 增强情感冲击力
- 让故事更加动人心弦
- 保持甜蜜与忧伤的平衡`,
        temperature: 0.8,
        maxTokens: 120,
      });

      // Update story content directly
      const newContent = activeStory.content + text;
      const { error } = await supabase
        .from("stories")
        .update({
          content: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeStory.id);

      if (error) {
        console.error("Error updating story:", error);
        return NextResponse.json(
          { error: "Failed to update story" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, story: newContent });
    }

    return NextResponse.json({ success: true, message: "Story is active" });
  } catch (error) {
    console.error("Generate story error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
