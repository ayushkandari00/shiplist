import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { authApi, apiErrorMessage, postsApi, commentsApi, adminApi } from './lib/api';
import { categories, statuses, statusMap, sortMap } from './constants/maps';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

const idOf = (item) => item?._id || item?.id;
const initials = (name = '?') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const authorName = (post) => post?.author?.name || post?.authorName || 'Shiplist member';
const ago = (value) => {
  if (!value) return '';
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value)) / 60000));
  return minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
};
const Icon = ({ children }) => <span className="icon" aria-hidden="true">{children}</span>;
const Avatar = ({ name }) => <span className="avatar">{initials(name)}</span>;
const Badge = ({ status, category }) => {
  const item = statusMap[status];
  return <span className={`badge ${item?.tone || 'category'}`}>{item?.label || category}</span>;
};
const isAdmin = (user) => user?.role === 'ADMIN';
const isOwner = (user, item) => String(idOf(item?.author) || item?.author) === String(idOf(user));

function Toast({ toast }) {
  return toast ? <div className={`toast ${toast.kind || ''}`}>{toast.message}</div> : null;
}

function SkeletonRows() {
  return (
    <div className="list skeleton-list">
      {[1, 2, 3, 4].map((n) => (
        <div className="skeleton-row" key={n}>
          <i />
          <div>
            <b />
            <span />
            <em />
          </div>
        </div>
      ))}
    </div>
  );
}

function Vote({ post, onVote }) {
  const voted = Boolean(post.hasVoted);
  return (
    <button
      className={`vote ${voted ? 'voted' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onVote(post);
      }}
      title={voted ? 'Remove vote' : 'Upvote'}
    >
      <Icon>👍</Icon> {post.voteCount}
    </button>
  );
}

function PostRow({ post, onOpen, onVote }) {
  return (
    <article className="post-row" onClick={() => onOpen(idOf(post))} tabIndex="0" role="button">
      <Vote post={post} onVote={onVote} />
      <div className="post-main">
        <div className="post-header">
          <h3>{post.title}</h3>
          <Badge status={post.status} category={post.category} />
        </div>
        <p className="post-excerpt">{post.description?.slice(0, 100)}</p>
        <div className="post-meta">
          <span>
            <Avatar name={authorName(post)} /> {authorName(post)}
          </span>
          <span>{ago(post.createdAt)}</span>
          <span>
            <Icon>💬</Icon> {post.commentCount || 0}
          </span>
        </div>
      </div>
    </article>
  );
}

function PostForm({ post, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: post?.title || '',
    description: post?.description || '',
    category: post?.category || categories[0],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-modal">
      <div className="form-header">
        <h2>{post ? 'Edit request' : 'New request'}</h2>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="form-group">
        <label>Title</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="What feature should we ship?"
          required
          disabled={busy}
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe the idea..."
          rows="5"
          required
          disabled={busy}
        />
      </div>
      <div className="form-group">
        <label>Category</label>
        <select name="category" value={form.category} onChange={handleChange} disabled={busy}>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function Feed({ openPost, toast }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    page: 1,
    category: 'All',
    status: 'All',
    sortLabel: 'Newest',
    search: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [create, setCreate] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((old) => ({ ...old, search: query, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const sort = sortMap[filters.sortLabel];
      const data = await postsApi.list({
        page: filters.page,
        limit: 10,
        search: filters.search,
        category: filters.category === 'All' ? undefined : filters.category,
        status: filters.status === 'All' ? undefined : filters.status,
        sort: sort?.sort,
        order: sort?.order,
      });
      setPosts(data.posts || []);
      setPagination({
        page: data.page,
        pages: data.pages,
        total: data.total,
      });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters.page, filters.search, filters.category, filters.status, filters.sortLabel]);

  const vote = async (post) => {
    if (!user) return toast('Log in to vote.', 'error');
    const previous = post;
    setPosts((items) =>
      items.map((item) =>
        idOf(item) === idOf(post)
          ? { ...item, hasVoted: !item.hasVoted, voteCount: item.voteCount + (item.hasVoted ? -1 : 1) }
          : item
      )
    );
    try {
      await postsApi.vote(idOf(post), post.hasVoted);
    } catch (err) {
      setPosts((items) =>
        items.map((item) => (idOf(item) === idOf(post) ? previous : item))
      );
      toast(apiErrorMessage(err), 'error');
    }
  };

  const createPost = async (form) => {
    if (!user) {
      toast('Log in to create a request.', 'error');
      return;
    }
    await postsApi.create(form);
    setCreate(false);
    toast('Request created');
    load();
  };

  const set = (key, value) => setFilters({ ...filters, [key]: value, page: 1 });

  return (
    <main className="page feed">
      <header className="page-head">
        <div>
          <p className="eyebrow">Customer feedback</p>
          <h1>What should we ship next?</h1>
          <p className="subhead">Vote on ideas, add them to the public roadmap</p>
        </div>
        {user && (
          <button className="btn btn-primary" onClick={() => setCreate(true)}>
            <Icon>➕</Icon> New request
          </button>
        )}
      </header>

      {create && (
        <PostForm
          onCancel={() => setCreate(false)}
          onSave={createPost}
        />
      )}

      <section className="page-filters">
        <input
          type="text"
          className="search"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search requests"
        />
        <select value={filters.category} onChange={(e) => set('category', e.target.value)}>
          <option>All</option>
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
          <option>All</option>
          {statuses.map((st) => (
            <option key={st}>{st}</option>
          ))}
        </select>
        <select value={filters.sortLabel} onChange={(e) => set('sortLabel', e.target.value)}>
          <option>Newest</option>
          <option>Trending</option>
          <option>Most Discussed</option>
        </select>
      </section>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <SkeletonRows />
      ) : posts.length > 0 ? (
        <div className="list">
          {posts.map((post) => (
            <PostRow
              key={idOf(post)}
              post={post}
              onOpen={openPost}
              onVote={vote}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No requests found. Be the first to suggest one!</p>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page === 1}
            onClick={() => set('page', pagination.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={pagination.page === pagination.pages}
            onClick={() => set('page', pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}

function Comment({ comment, depth, postId, reload, toast }) {
  const { user } = useAuth();
  const [reply, setReply] = useState(false);
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [busy, setBusy] = useState(false);

  const handleReply = async () => {
    if (!user) return toast('Log in to comment.', 'error');
    if (!content.trim()) return;
    setBusy(true);
    try {
      await commentsApi.create(postId, {
        content,
        parentComment: comment._id,
      });
      setContent('');
      setReply(false);
      reload();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;
    setBusy(true);
    try {
      await commentsApi.delete(comment._id);
      reload();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setBusy(true);
    try {
      await commentsApi.update(comment._id, { content: editContent });
      setEditContent('');
      setEditing(false);
      reload();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`comment comment-depth-${Math.min(depth, 3)}`}>
      <div className="comment-header">
        <Avatar name={comment.author?.name} /> <strong>{comment.author?.name}</strong>
        <em>{ago(comment.createdAt)}</em>
      </div>

      {editing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows="3"
            disabled={busy}
          />
          <div className="comment-actions">
            <button onClick={handleSaveEdit} disabled={busy}>
              Save
            </button>
            <button onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <ReactMarkdown>{comment.content}</ReactMarkdown>
          <div className="comment-actions">
            {user && isOwner(user, comment) && (
              <>
                <button onClick={() => setEditing(true)} disabled={busy}>
                  Edit
                </button>
                <button onClick={handleDelete} disabled={busy}>
                  Delete
                </button>
              </>
            )}
            {user && (
              <button onClick={() => setReply(!reply)} disabled={busy}>
                Reply
              </button>
            )}
          </div>
        </div>
      )}

      {reply && (
        <div className="comment-reply-form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a reply..."
            rows="2"
            disabled={busy}
          />
          <button onClick={handleReply} disabled={busy}>
            {busy ? 'Posting...' : 'Post reply'}
          </button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="replies">
          {comment.replies.map((reply) => (
            <Comment
              key={reply._id}
              comment={reply}
              depth={depth + 1}
              postId={postId}
              reload={reload}
              toast={toast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ postId, back, toast }) {
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [postData, commentsData] = await Promise.all([
        postsApi.get(postId),
        commentsApi.list(postId),
      ]);
      setPost(postData);

      // Build threaded comments
      const commentMap = {};
      const threaded = [];
      commentsData.forEach((c) => {
        commentMap[c._id] = { ...c, replies: [] };
      });
      commentsData.forEach((c) => {
        if (c.parentComment) {
          commentMap[c.parentComment]?.replies?.push(commentMap[c._id]);
        } else {
          threaded.push(commentMap[c._id]);
        }
      });
      setComments(threaded);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [postId]);

  const vote = async () => {
    if (!user) return toast('Log in to vote.', 'error');
    const previous = post;
    setPost({
      ...post,
      hasVoted: !post.hasVoted,
      voteCount: post.voteCount + (post.hasVoted ? -1 : 1),
    });
    try {
      await postsApi.vote(postId, post.hasVoted);
    } catch (err) {
      setPost(previous);
      toast(apiErrorMessage(err), 'error');
    }
  };

  const addComment = async () => {
    if (!user) return toast('Log in to comment.', 'error');
    if (!newComment.trim()) return;
    setBusy(true);
    try {
      await commentsApi.create(postId, { content: newComment });
      setNewComment('');
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <main className="page detail"><SkeletonRows /></main>;
  if (error) return <main className="page detail"><div className="form-error">{error}</div></main>;
  if (!post) return <main className="page detail"><p>Post not found</p></main>;

  return (
    <main className="page detail">
      <button className="back" onClick={back}>
        ← All requests
      </button>
      <div className="detail-grid">
        <article>
          <div className="detail-top">
            <Vote post={post} onVote={vote} />
            <div>
              <Badge status={post.status} category={post.category} />
            </div>
          </div>
          <h1>{post.title}</h1>
          <div className="detail-meta">
            <span>
              <Avatar name={authorName(post)} /> {authorName(post)}
            </span>
            <span>{ago(post.createdAt)}</span>
          </div>
          <ReactMarkdown>{post.description}</ReactMarkdown>

          <section className="comments-section">
            <h2>Comments ({comments.length})</h2>

            {user && (
              <div className="new-comment">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows="3"
                  disabled={busy}
                />
                <button onClick={addComment} disabled={busy}>
                  {busy ? 'Posting...' : 'Post comment'}
                </button>
              </div>
            )}

            {!user && (
              <p className="form-notice">
                <Icon>ℹ️</Icon> Log in to leave a comment
              </p>
            )}

            <div className="comments-list">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <Comment
                    key={comment._id}
                    comment={comment}
                    depth={0}
                    postId={postId}
                    reload={load}
                    toast={toast}
                  />
                ))
              ) : (
                <p className="empty-state">No comments yet. Be the first to comment!</p>
              )}
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}

function Roadmap({ openPost }) {
  const [posts, setPosts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      ['Planned', 'In Progress', 'Completed'].map((status) =>
        postsApi
          .list({ status, limit: 50 })
          .then((data) => ({ status, posts: data.posts }))
      )
    )
      .then((results) => {
        const grouped = {};
        results.forEach(({ status, posts }) => {
          grouped[status] = posts;
        });
        setPosts(grouped);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="page roadmap"><SkeletonRows /></main>;

  return (
    <main className="page roadmap">
      <header className="page-head">
        <div>
          <p className="eyebrow">Public roadmap</p>
          <h1>What's coming</h1>
          <p className="subhead">See what we're building</p>
        </div>
      </header>

      <div className="roadmap-grid">
        {['Planned', 'In Progress', 'Completed'].map((status) => (
          <section key={status} className="roadmap-column">
            <h2>{statusMap[status]?.label || status}</h2>
            <div className="roadmap-posts">
              {(posts[status] || []).map((post) => (
                <article
                  key={idOf(post)}
                  className="roadmap-post"
                  onClick={() => openPost(idOf(post))}
                  role="button"
                  tabIndex="0"
                >
                  <h4>{post.title}</h4>
                  <p>{post.description?.slice(0, 100)}</p>
                  <div className="roadmap-meta">
                    <span>
                      <Icon>👍</Icon> {post.voteCount}
                    </span>
                    <span>
                      <Icon>💬</Icon> {post.commentCount || 0}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Admin({ openPost, toast }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const data = await postsApi.list({ limit: 100 });
      setPosts(data.posts || []);
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (postId, newStatus) => {
    try {
      await adminApi.updateStatus(postId, newStatus);
      toast(`Status updated to ${newStatus}`);
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  if (!isAdmin(user)) {
    return (
      <main className="page admin">
        <div className="form-error">Access denied. Admin only.</div>
      </main>
    );
  }

  if (loading) return <main className="page admin"><SkeletonRows /></main>;

  return (
    <main className="page admin">
      <header className="page-head">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1>Manage requests</h1>
          <p className="subhead">Review and update feature request statuses</p>
        </div>
      </header>

      <div className="admin-list">
        {posts.map((post) => (
          <div key={idOf(post)} className="admin-row">
            <div onClick={() => openPost(idOf(post))} role="button" tabIndex="0" style={{ cursor: 'pointer' }}>
              <h4>{post.title}</h4>
              <p className="eyebrow">{post.category}</p>
            </div>
            <div className="admin-controls">
              <select
                value={post.status}
                onChange={(e) => updateStatus(idOf(post), e.target.value)}
              >
                {statuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <span className="badge">
                <Icon>👍</Icon> {post.voteCount}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function App() {
  const { user, loading, logout } = useAuth();
  const [route, setRoute] = useState({ page: 'landing', postId: null });
  const [toastState, setToastState] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'landing', 'login', 'signup'

  useEffect(() => {
    if (!loading) {
      if (user) {
        setRoute({ page: isAdmin(user) ? 'admin' : 'feed', postId: null });
      } else {
        setRoute({ page: 'landing', postId: null });
      }
    }
  }, [user, loading]);

  const toast = (message, kind = 'success') => {
    setToastState({ message, kind });
    setTimeout(() => setToastState(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      setRoute({ page: 'landing', postId: null });
      toast('Logged out');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!user) {
    if (route.page === 'landing') {
      return (
        <>
          <LandingPage onGetStarted={() => setRoute({ page: 'login', postId: null })} />
          <Toast toast={toastState} />
        </>
      );
    }

    if (route.page === 'login') {
      return (
        <>
          <LoginPage
            onLoginSuccess={() => {
              const currentUser = user;
              setRoute({ page: isAdmin(currentUser) ? 'admin' : 'feed', postId: null });
              toast(`Welcome back, ${currentUser?.name}!`);
            }}
            onShowSignup={() => setRoute({ page: 'signup', postId: null })}
            toast={toast}
          />
          <Toast toast={toastState} />
        </>
      );
    }

    if (route.page === 'signup') {
      return (
        <>
          <SignupPage
            onSignupSuccess={() => setRoute({ page: 'login', postId: null })}
            onShowLogin={() => setRoute({ page: 'login', postId: null })}
            toast={toast}
          />
          <Toast toast={toastState} />
        </>
      );
    }
  }

  // Main app navigation
  const nav = (
    <nav className="nav">
      <div className="nav-brand">
        <button onClick={() => setRoute({ page: isAdmin(user) ? 'admin' : 'feed', postId: null })}>
          🚀 Shiplist
        </button>
      </div>
      <div className="nav-links">
        {isAdmin(user) && (
          <>
            <button onClick={() => setRoute({ page: 'admin', postId: null })}>
              Manage
            </button>
            <button onClick={() => setRoute({ page: 'roadmap', postId: null })}>
              Roadmap
            </button>
          </>
        )}
        {!isAdmin(user) && (
          <>
            <button onClick={() => setRoute({ page: 'feed', postId: null })}>
              Requests
            </button>
            <button onClick={() => setRoute({ page: 'roadmap', postId: null })}>
              Roadmap
            </button>
          </>
        )}
      </div>
      <div className="nav-end">
        <div className="user-menu">
          <Avatar name={user.name} />
          <span>{user.name}</span>
          <button onClick={handleLogout} className="nav-logout">
            Log out
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {nav}
      {route.page === 'feed' && (
        <Feed
          openPost={(postId) => setRoute({ page: 'detail', postId })}
          toast={toast}
        />
      )}
      {route.page === 'detail' && (
        <Detail
          postId={route.postId}
          back={() => setRoute({ page: 'feed', postId: null })}
          toast={toast}
        />
      )}
      {route.page === 'roadmap' && (
        <Roadmap
          openPost={(postId) => setRoute({ page: 'detail', postId })}
        />
      )}
      {route.page === 'admin' && (
        <Admin
          openPost={(postId) => setRoute({ page: 'detail', postId })}
          toast={toast}
        />
      )}
      <Toast toast={toastState} />
    </>
  );
}
