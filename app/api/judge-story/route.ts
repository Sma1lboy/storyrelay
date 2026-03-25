import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { getServiceSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

interface JudgeComment {
  persona: string;
  emoji: string;
  comment: string;
}

const JUDGES = [
  {
    persona: "毒舌评委",
    emoji: "🗡️",
    prompt: `你是一个毒舌文学评委，说话尖酸刻薄但有道理。你的点评风格：
- 用讽刺和夸张的手法指出故事的荒谬之处
- 偶尔夹杂网络流行语
- 虽然毒舌但能一针见血
- 最后还是会给出一点正面评价（傲娇式）
用2-3句话点评，不超过80字。`,
  },
  {
    persona: "文艺诗人",
    emoji: "🌸",
    prompt: `你是一个感性的文艺诗人评委，擅长从故事中发现美。你的点评风格：
- 用优美的词藻和比喻来评价
- 关注情感张力和意象之美
- 能捕捉到故事中细微的情感变化
- 总是被故事打动，但不是盲目夸赞
用2-3句话点评，不超过80字。`,
  },
  {
    persona: "吃瓜群众",
    emoji: "🍉",
    prompt: `你是一个热心吃瓜群众评委，用最接地气的方式点评故事。你的点评风格：
- 用日常口语和网络热梗
- 经常发出"卧槽"、"绝了"、"DNA动了"之类的感叹
- 会八卦故事里角色的感情线
- 看热闹不嫌事大，喜欢剧情反转
用2-3句话点评，不超过80字。`,
  },
  {
    persona: "哲学教授",
    emoji: "🎓",
    prompt: `你是一个深沉的哲学教授评委，喜欢从故事中提炼人生道理。你的点评风格：
- 用哲理性的语言解读故事主题
- 引用名人名言或经典哲学概念（但不要太学术）
- 把简单的故事上升到人生哲理的高度
- 有时候过度解读但很有趣
用2-3句话点评，不超过80字。`,
  },
];

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();

    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY not configured");
      return NextResponse.json(
        { error: "AI not configured" },
        { status: 500 }
      );
    }

    const { story_id } = await req.json();

    if (!story_id) {
      return NextResponse.json(
        { error: "Missing story_id" },
        { status: 400 }
      );
    }

    // Fetch the story
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, content")
      .eq("id", story_id)
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    console.log(
      `=== Generating AI judge comments for story ${story_id} ===`
    );

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // Generate comments from all judges in parallel
    const commentPromises = JUDGES.map(async (judge) => {
      try {
        const { text } = await generateText({
          model: openrouter("google/gemini-2.5-flash"),
          prompt: `${judge.prompt}

以下是一个由多人协作完成的故事：

"${story.content}"

请用你的风格点评这个故事：`,
          temperature: 0.9,
          maxTokens: 200,
        });

        return {
          persona: judge.persona,
          emoji: judge.emoji,
          comment: text.trim(),
        } as JudgeComment;
      } catch (err) {
        console.error(`Judge ${judge.persona} failed:`, err);
        return {
          persona: judge.persona,
          emoji: judge.emoji,
          comment: "（评委暂时离席）",
        } as JudgeComment;
      }
    });

    const comments = await Promise.all(commentPromises);

    console.log(`Generated ${comments.length} judge comments`);

    // Save comments to the story
    const { error: updateError } = await supabase
      .from("stories")
      .update({ ai_comments: comments })
      .eq("id", story_id);

    if (updateError) {
      console.error("Error saving AI comments:", updateError);
      return NextResponse.json(
        { error: "Failed to save comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error("Judge story API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
