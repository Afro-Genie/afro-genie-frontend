import { useParams } from 'react-router-dom';

export default function TopicDetailPage() {
  const { topicId } = useParams();

  return (
    <div className="container">
      <h1>Topic Detail</h1>
      <div className="card">
        <p>Topic ID: {topicId}</p>
        <p className="muted">Threaded comments and reactions can be rendered here once backend routes are available.</p>
      </div>
    </div>
  );
}
