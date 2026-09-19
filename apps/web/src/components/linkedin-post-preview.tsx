import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Globe,
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Send,
  ImageOff,
} from "lucide-react";

interface LinkedInPostPreviewProps {
  authorName?: string;
  authorTitle?: string;
  authorAvatar?: string;
  followerCount?: string;
  content: string;
  imageUrl?: string;
  timestamp?: string;
  connectionDegree?: string;
}

// Renders text with blue hashtags and @mentions
function FormattedContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(#\w+|@\w+)/g);
        return (
          <span key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("#") || part.startsWith("@")) {
                return (
                  <span
                    key={j}
                    className="text-[#0a66c2] font-medium hover:underline cursor-pointer"
                  >
                    {part}
                  </span>
                );
              }
              return <span key={j}>{part}</span>;
            })}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

export function LinkedInPostPreview({
  authorName = "GCC Quest",
  authorTitle = "Technology, Information and Internet",
  authorAvatar,
  followerCount = "12,847 followers",
  content,
  imageUrl,
  timestamp = "1w",
  connectionDegree = "1st",
}: LinkedInPostPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const CHAR_LIMIT = 280;
  const isTruncatable = content.length > CHAR_LIMIT;
  const displayContent =
    !expanded && isTruncatable ? content.slice(0, CHAR_LIMIT) : content;

  return (
    // Wrapper simulates the LinkedIn feed background (light grey)
    <div className="w-full max-w-[548px] font-sans select-none">
      {/* LinkedIn-style feed background */}
      <div className="bg-white rounded-lg border border-[#e0dfdc] shadow-sm overflow-hidden">
        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div className="flex items-start gap-3">
            {/* Company Avatar — rounded square like LinkedIn company pages */}
            <Avatar className="w-[52px] h-[52px] rounded-[4px] shrink-0 border border-[#e0dfdc]">
              {authorAvatar ? (
                <AvatarImage src={authorAvatar} alt={authorName} />
              ) : (
                <AvatarFallback className="rounded-[4px] bg-[#f5c518] text-black font-bold text-lg tracking-tight">
                  GCC
                </AvatarFallback>
              )}
            </Avatar>

            {/* Author info */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-semibold text-[14px] text-[#000000e6] hover:text-[#0a66c2] hover:underline cursor-pointer leading-tight">
                  {authorName}
                </span>
                <span className="text-[12px] text-[#00000099] font-normal">
                  • {connectionDegree}
                </span>
                {/* Follow button — appears inline like LinkedIn */}
                <span className="text-[#0a66c2] font-semibold text-[12px] hover:bg-[#0a66c2]/10 rounded px-1 cursor-pointer leading-tight">
                  + Follow
                </span>
              </div>
              <span className="text-[12px] text-[#00000099] leading-tight mt-[1px] truncate max-w-[280px]">
                {authorTitle}
              </span>
              <div className="flex items-center gap-1 text-[12px] text-[#00000099] mt-[2px]">
                <span>{timestamp}</span>
                <span>•</span>
                <Globe className="w-[12px] h-[12px]" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 ml-2 mt-[-2px]">
            <button className="p-1.5 rounded-full hover:bg-[#00000014] text-[#00000099] transition-colors">
              <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── BODY TEXT ───────────────────────────────────── */}
        <div className="px-4 pb-2 text-[14px] leading-[1.5] text-[#000000e6] font-normal">
          <FormattedContent text={displayContent} />
          {isTruncatable && (
            <>
              {!expanded && <span className="text-[#00000099]">… </span>}
              <button
                onClick={() => setExpanded((p) => !p)}
                className="text-[#00000099] hover:text-[#000000e6] font-semibold text-[14px] focus:outline-none"
              >
                {expanded ? "see less" : "see more"}
              </button>
            </>
          )}
        </div>

        {/* ── IMAGE SECTION ───────────────────────────────── */}
        {imageUrl ? (
          // Real image from API / article thumbnail
          <div className="w-full border-t border-[#e0dfdc]">
            <img
              src={imageUrl}
              alt="Post image"
              className="w-full object-cover max-h-[400px]"
              onError={(e) => {
                // If image fails to load, hide this element
                (e.currentTarget.parentElement as HTMLElement).style.display =
                  "none";
              }}
            />
          </div>
        ) : (
          // Subtle "no image" state — not the ugly grey box
          <div className="mx-4 mb-3 border border-dashed border-[#c5c3be] rounded-md flex items-center justify-center py-5 gap-2 text-[#00000066] bg-[#f9f9f8]">
            <ImageOff className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-[12px]">No image attached</span>
          </div>
        )}

        {/* ── SOCIAL COUNTS ───────────────────────────────── */}
        <div className="px-4 py-1 flex items-center justify-between border-b border-[#e0dfdc]">
          <div className="flex items-center gap-1 text-[#00000099] hover:text-[#0a66c2] cursor-pointer">
            {/* Reaction emoji stack */}
            <div className="flex items-center">
              <span
                className="text-[16px] leading-none"
                title="Like"
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }}
              >
                👍
              </span>
              <span
                className="text-[16px] leading-none -ml-1"
                title="Love"
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }}
              >
                ❤️
              </span>
              <span
                className="text-[16px] leading-none -ml-1"
                title="Insightful"
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }}
              >
                💡
              </span>
            </div>
            <span className="text-[12px] ml-1 hover:underline">247</span>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-[#00000099]">
            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">
              18 comments
            </span>
            <span className="hover:text-[#0a66c2] hover:underline cursor-pointer">
              4 reposts
            </span>
          </div>
        </div>

        {/* ── ACTION BAR ──────────────────────────────────── */}
        <div className="flex items-center px-1 py-1">
          {(
            [
              {
                icon: ThumbsUp,
                label: "Like",
                rotate: false,
                hoverColor: "hover:text-[#0a66c2]",
              },
              {
                icon: MessageSquare,
                label: "Comment",
                rotate: false,
                hoverColor: "hover:text-[#0a66c2]",
              },
              {
                icon: Repeat2,
                label: "Repost",
                rotate: false,
                hoverColor: "hover:text-[#0a66c2]",
              },
              {
                icon: Send,
                label: "Send",
                rotate: true,
                hoverColor: "hover:text-[#0a66c2]",
              },
            ] as Array<{
              icon: React.ElementType;
              label: string;
              rotate: boolean;
              hoverColor: string;
            }>
          ).map(({ icon: Icon, label, rotate, hoverColor }) => (
            <button
              key={label}
              className={`flex items-center justify-center gap-1.5 py-3 px-2 flex-1 rounded-sm text-[#00000099] ${hoverColor} hover:bg-[#00000014] transition-colors group`}
            >
              <Icon
                className={`w-[18px] h-[18px] ${rotate ? "-rotate-45" : ""}`}
                strokeWidth={1.5}
              />
              <span className="text-[13px] font-semibold hidden sm:inline">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── POST AUTHOR ATTRIBUTION (below the card) ────── */}
      <p className="text-[11px] text-center text-[#00000066] mt-2">
        Preview only — not published to LinkedIn
      </p>
    </div>
  );
}
