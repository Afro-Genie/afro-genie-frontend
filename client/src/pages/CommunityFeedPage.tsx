import { useParams } from 'react-router-dom';

export default function CommunityFeedPage() {
  const { categoryId } = useParams();

  return (
    <div className="container">
      <h1>Community Feed</h1>
      <div className="card">
        <p>Category: {categoryId}</p>
        <p className="muted">Topic feed integration can be connected when community endpoints are exposed.</p>
      </div>
    </div>
  );
}
