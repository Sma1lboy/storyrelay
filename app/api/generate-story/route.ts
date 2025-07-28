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
      // Create new story with AI
      const { text } = await generateText({
        model: openrouter("google/gemini-flash-1.5"),
        prompt: `生成一个唯美的中文短篇小说开头句子，要求：
1. 必须是中文，唯美文艺
2. 长度在25-45个汉字之间
3. 甜中带苦，足够刀人，能吸引读者
4. 要有强烈的情感冲击力和悬念
5. 用中文句号。结尾
6. 只返回一个句子，不要其他内容

风格要求：
- 唯美浪漫但暗含悲伤
- 有强烈的情感张力
- 让人心疼的美好
- 甜蜜中透露着不舍和遗憾

示例风格：
- 她在婚礼前一夜收到了他寄来的最后一封信，信封上还残留着三年前的邮戳。
- 樱花飘落的瞬间，他终于想起了她临终前说过的那句话。
- 她把结婚戒指轻轻放在他的墓碑前，就像当年他为她戴上时一样温柔。`,
        temperature: 0.9,
        maxTokens: 120,
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
        model: openrouter("google/gemini-flash-1.5"),
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

      // Add AI submission
      const { error } = await supabase.from("submissions").insert({
        story_id: activeStory.id,
        content: text,
        user_id: "ai-generator",
        user_name: "Foxyfox",
        votes: 0,
        round_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      if (error) {
        console.error("Error creating AI submission:", error);
        return NextResponse.json(
          { error: "Failed to create submission" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, submission: text });
    }

    return NextResponse.json({ success: true, message: "Story is active" });
  } catch (error) {
    console.error("Generate story error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
