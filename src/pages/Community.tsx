import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Users, Heart, Send, Plus, Trash2, LogIn } from "lucide-react";
import Footer from "@/components/Footer";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: { username: string; display_name: string; avatar_url: string | null };
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  profiles?: { username: string; display_name: string; avatar_url: string | null };
}

const CATEGORIES = ["general", "aerodynamics", "propulsion", "structures", "career", "projects"];

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [posting, setPosting] = useState(false);

  // Fetch posts
  useEffect(() => {
    fetchPosts();
  }, [filterCategory]);

  // Fetch user's likes
  useEffect(() => {
    if (user) fetchUserLikes();
  }, [user]);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("community_posts")
      .select("*, profiles!community_posts_author_id_fkey(username, display_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load posts");
    } else {
      setPosts((data as any) || []);
    }
    setLoading(false);
  };

  const fetchUserLikes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("community_likes")
      .select("post_id")
      .eq("user_id", user.id);
    if (data) {
      setLikedPosts(new Set(data.map((l: any) => l.post_id)));
    }
  };

  const handleCreatePost = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      author_id: user.id,
    });
    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post created!");
      setNewTitle("");
      setNewContent("");
      setNewCategory("general");
      setShowNewPost(false);
      fetchPosts();
    }
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) { navigate("/auth"); return; }
    if (likedPosts.has(postId)) {
      await supabase.from("community_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      setLikedPosts((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p));
    } else {
      await supabase.from("community_likes").insert({ post_id: postId, user_id: user.id });
      setLikedPosts((prev) => new Set(prev).add(postId));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));
    }
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from("community_posts").delete().eq("id", postId);
    if (error) toast.error("Failed to delete");
    else { toast.success("Post deleted"); fetchPosts(); setSelectedPost(null); }
  };

  // Comments
  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from("community_comments")
      .select("*, profiles!community_comments_author_id_fkey(username, display_name, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setComments((data as any) || []);
  };

  const handleOpenComments = (postId: string) => {
    if (selectedPost === postId) { setSelectedPost(null); return; }
    setSelectedPost(postId);
    fetchComments(postId);
  };

  const handleAddComment = async (postId: string) => {
    if (!user) { navigate("/auth"); return; }
    if (!newComment.trim()) return;
    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      author_id: user.id,
      content: newComment.trim(),
    });
    if (error) toast.error("Failed to comment");
    else {
      setNewComment("");
      fetchComments(postId);
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    const { error } = await supabase.from("community_comments").delete().eq("id", commentId);
    if (!error) {
      fetchComments(postId);
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count - 1 } : p));
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getInitials = (name: string) => name?.slice(0, 2).toUpperCase() || "??";

  return (
    <div className="min-h-screen flex flex-col relative">
      <PageBreadcrumb />

      {/* Hero */}
      <section className="relative py-12 pt-24">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground font-[Orbitron]">
              AERORBIS Community
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Share knowledge, ask questions, and connect with aerospace engineers worldwide.
            </p>
            <div className="flex gap-3 justify-center">
              {user ? (
                <Button onClick={() => setShowNewPost(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> New Post
                </Button>
              ) : (
                <Button onClick={() => navigate("/auth")} className="gap-2">
                  <LogIn className="w-4 h-4" /> Sign In to Post
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filter + Content */}
      <section className="flex-1 pb-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Category Filter */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Button
              variant={filterCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory("all")}
              className="text-xs"
            >
              All
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={filterCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory(cat)}
                className="text-xs capitalize"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* New Post Form */}
          <AnimatePresence>
            {showNewPost && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <Card className="bg-card/60 backdrop-blur-xl border-primary/20">
                  <CardContent className="pt-6 space-y-3">
                    <Input
                      placeholder="Post title..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="bg-background/50 border-primary/20"
                    />
                    <Textarea
                      placeholder="What's on your mind?"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={4}
                      className="bg-background/50 border-primary/20"
                    />
                    <div className="flex gap-3 items-center">
                      <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger className="w-40 bg-background/50 border-primary/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex-1" />
                      <Button variant="outline" onClick={() => setShowNewPost(false)} size="sm">Cancel</Button>
                      <Button onClick={handleCreatePost} disabled={posting} size="sm" className="gap-1">
                        <Send className="w-3 h-3" /> Post
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Posts */}
          {loading ? (
            <div className="text-center py-20 text-muted-foreground">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="bg-card/40 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-9 h-9 border border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {getInitials(post.profiles?.display_name || post.profiles?.username || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {post.profiles?.display_name || post.profiles?.username || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                              {post.category}
                            </span>
                          </div>
                          <CardTitle className="text-lg mt-1 text-foreground">{post.title}</CardTitle>
                        </div>
                        {user?.id === post.author_id && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                    </CardContent>
                    <CardFooter className="pt-0 gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className={`gap-1.5 text-xs ${likedPosts.has(post.id) ? "text-red-400" : "text-muted-foreground"}`}
                      >
                        <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? "fill-red-400" : ""}`} />
                        {post.likes_count}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenComments(post.id)}
                        className="gap-1.5 text-xs text-muted-foreground"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {post.comments_count}
                      </Button>
                    </CardFooter>

                    {/* Comments section */}
                    <AnimatePresence>
                      {selectedPost === post.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-border/30 px-6 pb-4 overflow-hidden"
                        >
                          <div className="pt-4 space-y-3 max-h-60 overflow-y-auto">
                            {comments.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                            ) : (
                              comments.map((c) => (
                                <div key={c.id} className="flex gap-2 items-start">
                                  <Avatar className="w-6 h-6 border border-primary/10">
                                    <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                                      {getInitials(c.profiles?.display_name || c.profiles?.username || "")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-foreground">
                                        {c.profiles?.display_name || c.profiles?.username}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{c.content}</p>
                                  </div>
                                  {user?.id === c.author_id && (
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(c.id, post.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                          {user && (
                            <div className="flex gap-2 mt-3">
                              <Input
                                placeholder="Write a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                                className="text-xs h-8 bg-background/50 border-primary/20"
                              />
                              <Button size="sm" onClick={() => handleAddComment(post.id)} className="h-8 px-3">
                                <Send className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Community;
