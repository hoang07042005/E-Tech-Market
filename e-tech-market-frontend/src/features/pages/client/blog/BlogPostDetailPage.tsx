import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch, API_BASE_URL } from "@/configs/api.config";
import { Helmet } from "react-helmet-async";
import "@/styles/pages/BlogPostDetailPage.css";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  content: string;
  thumbnail_url: string | null;
  published_at: string;
  reading_time?: number;
  views?: number;
  comments_count?: number;
  comments?: BlogComment[];
  meta_title: string | null;
  meta_description: string | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  author: {
    id: number;
    name: string;
    avatar_url: string | null;
  } | null;
};

type BlogComment = {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    avatar_url: string | null;
  } | null;
};

type StoredUser = {
  name?: string;
  email?: string;
};

const resolveImageUrl = (url: string | null) => {
  if (!url) return "https://via.placeholder.com/1200x600";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

function firstLetter(name: string) {
  const s = (name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || s;
  return last.slice(0, 1).toUpperCase();
}

export default function BlogPostDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
  const storedUser: StoredUser | null = (() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  })();
  const canComment = !!token;
  const sanitizedContent = useMemo(
    () =>
      sanitizeHtml(post?.content || "<p>Nội dung đang được cập nhật...</p>"),
    [post?.content],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<BlogPost>(`/api/blog/posts/${slug}`)
      .then((res) => {
        if (active) {
          setPost({
            ...res,
            comments: res.comments ?? [],
          });
        }
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="postPage">
        <div
          className="ppContainer"
          style={{ padding: "100px 0", textAlign: "center" }}
        >
          <div className="adminLoader" style={{ margin: "0 auto 20px" }}></div>
          <p>Đang chuẩn bị bài viết...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="postPage">
        <div
          className="ppContainer"
          style={{ padding: "100px 0", textAlign: "center" }}
        >
          <h1>Không tìm thấy bài viết</h1>
          <p>Bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ bỏ.</p>
          <Link
            to="/blog"
            className="adminBtnPrimary"
            style={{
              display: "inline-block",
              marginTop: "20px",
              textDecoration: "none",
            }}
          >
            Quay lại trang Blog
          </Link>
        </div>
      </div>
    );
  }

  const submitComment = async () => {
    if (!slug || commentSubmitting) return;
    if (!token) {
      setCommentMessage("Vui lòng đăng nhập để bình luận.");
      return;
    }
    setCommentSubmitting(true);
    setCommentMessage(null);
    try {
      const created = await apiFetch<BlogComment>(
        `/api/blog/posts/${slug}/comments`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            content: commentContent,
          }),
        },
      );
      setPost((current) =>
        current
          ? {
              ...current,
              comments: [created, ...(current.comments ?? [])],
              comments_count:
                (current.comments_count ?? current.comments?.length ?? 0) + 1,
            }
          : current,
      );
      setCommentContent("");
      setCommentMessage("Bình luận đã được gửi.");
    } catch (e) {
      setCommentMessage(
        e instanceof Error ? e.message : "Không gửi được bình luận.",
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <div className="postPage">
      <Helmet>
        <title>{post.meta_title || post.title} | E-Tech Blog</title>
        {post.meta_description && (
          <meta name="description" content={post.meta_description} />
        )}
      </Helmet>

      <div className="ppContainer">
        <div className="postBreadcrumb">
          <Link to="/">Trang chủ</Link> • <Link to="/blog">Tin tức</Link> •{" "}
          <span>{post.title}</span>
        </div>

        <div className="postMainGrid">
          <div className="postMainContent">
            {post.category && (
              <span className="postCategory">{post.category.name}</span>
            )}
            <h1 className="postTitle">{post.title}</h1>

            <div className="postMeta">
              <div className="postMetaItem">
                {post.author?.avatar_url ? (
                  <div className="authorMiniAvatar">
                    <img
                      src={resolveImageUrl(post.author.avatar_url)}
                      alt={post.author.name}
                    />
                  </div>
                ) : (
                  <div className="authorMiniAvatar authorMiniFallback">
                    {firstLetter(post.author?.name || "B")}
                  </div>
                )}
                <span>{post.author?.name || "Ban biên tập"}</span>
              </div>
              <div className="postMetaItem">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>
                  {new Date(post.published_at).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div className="postMetaItem">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{post.reading_time} phút đọc</span>
              </div>
            </div>

            <img
              src={resolveImageUrl(post.thumbnail_url)}
              alt={post.title}
              className="postFeaturedImage"
            />

            <div
              className="postContent"
              style={{ minHeight: "300px" }}
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

            {/* Social Share */}
            <div className="postShare">
              <div className="postShareButtons">
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#0f172a",
                    marginRight: "10px",
                  }}
                >
                  Chia sẻ:
                </span>
                <div className="postShareBtn">f</div>
                <div className="postShareBtn">t</div>
                <div className="postShareBtn">🔗</div>
              </div>
              <div
                style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600 }}
              >
                👁️ {(post.views || 0).toLocaleString()} lượt xem
              </div>
            </div>

            {/* Comments Section */}
            <div className="commentsSection">
              <h3 className="commentCount">
                Bình luận ({post.comments_count ?? post.comments?.length ?? 0})
              </h3>
              <div className="commentList">
                {(post.comments ?? []).map((comment) => (
                  <div className="commentItem" key={comment.id}>
                    <div className="commentAvatar">
                      {comment.user?.avatar_url ? (
                        <img
                          src={resolveImageUrl(comment.user.avatar_url)}
                          alt={comment.author_name}
                          className="commentAvatarImg"
                        />
                      ) : (
                        <div className="commentAvatarFallback">
                          {firstLetter(comment.author_name)}
                        </div>
                      )}
                    </div>

                    <div className="commentBody">
                      <div className="commentHead">
                        <span className="commentAuthor">
                          {comment.author_name}
                        </span>
                        <span className="commentDate">
                          {new Date(comment.created_at).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <p className="commentText">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="commentForm">
                {canComment ? (
                  <>
                    <p className="commentText">
                      Bình luận với tài khoản{" "}
                      {storedUser?.name ||
                        storedUser?.email ||
                        "đang đăng nhập"}
                      .
                    </p>
                    <textarea
                      placeholder="Viết bình luận của bạn..."
                      className="commentTextarea"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                    />
                    <button
                      className="commentSubmit"
                      disabled={commentSubmitting}
                      onClick={() => void submitComment()}
                    >
                      {commentSubmitting ? "Đang gửi..." : "Gửi bình luận"}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="commentSubmit"
                    style={{ display: "inline-block", textDecoration: "none" }}
                  >
                    Đăng nhập để bình luận
                  </Link>
                )}
                {commentMessage && (
                  <p className="commentText">{commentMessage}</p>
                )}
              </div>
            </div>
          </div>

          <aside className="postSidebar">
            <div className="postSidebarWidget blogNewsletter">
              <div className="blogNewsletterIcon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h3 className="blogNewsletterTitle">Đăng ký nhận tin</h3>
              <p className="blogNewsletterDesc">
                Cập nhật tin công nghệ mới nhất hàng tuần.
              </p>
              <button className="blogNewsletterBtn">Đăng ký ngay</button>
            </div>

            <div className="postSidebarWidget">
              <h3 className="postWidgetTitle">Chuyên mục</h3>
              <div className="postTagCloud">
                <Link to="/blog" className="postTag">
                  Công nghệ
                </Link>
                <Link to="/blog" className="postTag">
                  Đánh giá
                </Link>
                <Link to="/blog" className="postTag">
                  Mẹo hay
                </Link>
                <Link to="/blog" className="postTag">
                  Xu hướng
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
