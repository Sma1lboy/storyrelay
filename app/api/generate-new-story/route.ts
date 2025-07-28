import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// This endpoint creates a completely new story (dev mode only)
export async function POST() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: "Only available in development" }, { status: 403 });
    }

    // Check if AI key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY not configured");
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    // Initialize OpenRouter with Gemini 2.5 Flash
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // Deactivate current active story
    await supabase
      .from("stories")
      .update({ is_active: false })
      .eq("is_active", true);

    // Generate new story opening with strong hook
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
      console.error("Error creating new story:", error);
      return NextResponse.json(
        { error: "Failed to create new story" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, story: text });
  } catch (error) {
    console.error("Generate new story error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}