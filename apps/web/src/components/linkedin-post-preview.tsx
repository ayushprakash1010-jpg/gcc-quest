import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Globe,
  MoreHorizontal,
  X,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Send,
} from "lucide-react";

interface LinkedInPostPreviewProps {
  authorName?: string;
  authorTitle?: string;
  authorAvatar?: string;
  content: string;
}

export function LinkedInPostPreview({
  authorName = "GCC Quest",
  authorTitle = "Technology, Information and Internet",
  authorAvatar,
  content,
}: LinkedInPostPreviewProps) {
  // Format content to render hashtags in blue and preserve line breaks
  const formattedContent = content.split("\n").map((line, i) => {
    // Basic hashtag regex matcher
    const parts = line.split(/(#\w+)/g);
    return (
      <span key={i}>
        {parts.map((part, j) => {
          if (part.startsWith("#")) {
            return (
              <span
                key={j}
                className="text-[#0a66c2] font-semibold hover:underline cursor-pointer"
              >
                {part}
              </span>
            );
          }
          return <span key={j}>{part}</span>;
        })}
        {i < content.split("\n").length - 1 && <br />}
      </span>
    );
  });

  return (
    <Card className="max-w-md w-full bg-white text-black overflow-hidden border-[#e5e5e5] rounded-lg font-sans shadow-sm mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-3 pt-4">
        <div className="flex items-center gap-2">
          <Avatar className="w-12 h-12 rounded-sm bg-zinc-100">
            {authorAvatar ? (
              <AvatarImage src={authorAvatar} />
            ) : (
              <AvatarFallback className="rounded-sm bg-yellow-400 text-black font-bold text-lg">
                GCC
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[14px] leading-tight text-black hover:text-[#0a66c2] hover:underline cursor-pointer">
                {authorName}
              </span>
              {/* Optional: Add a checkmark if verified */}
              <span className="text-muted-foreground text-xs font-normal">
                • 1st
              </span>
            </div>
            <span className="text-[12px] text-zinc-500 leading-tight">
              {authorTitle}
            </span>
            <div className="flex items-center gap-1 text-[12px] text-zinc-500 leading-tight mt-0.5">
              <span>8h • </span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <button className="hover:bg-zinc-100 p-1 rounded-full">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <button className="hover:bg-zinc-100 p-1 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-2 text-[14px] leading-[1.4] text-zinc-900 whitespace-pre-wrap font-normal">
        {formattedContent}
      </div>

      {/* Optional: Simulated Image Attachment area if we want to display a generic image */}
      <div className="w-full bg-zinc-100 aspect-video relative flex items-center justify-center border-y border-zinc-200">
        <span className="text-zinc-400 text-sm">
          Image Attachment Placeholder
        </span>
      </div>

      {/* Social Action Bar */}
      <div className="flex justify-between items-center px-2 py-1 border-t border-zinc-100 mt-2">
        <button className="flex items-center justify-center gap-1.5 p-3 hover:bg-zinc-100 rounded-md text-zinc-500 flex-1 transition-colors">
          <ThumbsUp className="w-4 h-4" />
          <span className="text-[12px] font-semibold">Like</span>
        </button>
        <button className="flex items-center justify-center gap-1.5 p-3 hover:bg-zinc-100 rounded-md text-zinc-500 flex-1 transition-colors">
          <MessageSquare className="w-4 h-4" />
          <span className="text-[12px] font-semibold">Comment</span>
        </button>
        <button className="flex items-center justify-center gap-1.5 p-3 hover:bg-zinc-100 rounded-md text-zinc-500 flex-1 transition-colors">
          <Repeat2 className="w-4 h-4" />
          <span className="text-[12px] font-semibold">Repost</span>
        </button>
        <button className="flex items-center justify-center gap-1.5 p-3 hover:bg-zinc-100 rounded-md text-zinc-500 flex-1 transition-colors">
          <Send className="w-4 h-4 -rotate-45" />
          <span className="text-[12px] font-semibold">Send</span>
        </button>
      </div>
    </Card>
  );
}
