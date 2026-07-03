import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const Leaderboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await api.getLeaderboard();
        setUsers(data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  const currentUserId = user?._id || user?.id;
  const topThree = users.slice(0, 3);

  return (
    <div className="leaderboard-page fade-in">
      <div className="leaderboard-hero glass-card">
        <div>
          <p className="leaderboard-eyebrow">Community bragging rights</p>
          <h1>🏆 Chai Champions</h1>
          <p>
            Every review helps your favorite chai spot rise through the ranks. Keep sipping,
            reviewing, and collecting points.
          </p>
        </div>
        <div className="leaderboard-hero-badge">
          <span>{users.length}</span>
          <small>reviewers</small>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="emoji">☕</div>
          <h3>No rankings yet</h3>
          <p>Be the first to leave a review and claim the top spot.</p>
        </div>
      ) : (
        <>
          <div className="leaderboard-podium">
            {topThree.map((entry, index) => {
              const rank = index + 1;
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
              const cardClass =
                rank === 1 ? 'podium-card podium-gold' : rank === 2 ? 'podium-card podium-silver' : 'podium-card podium-bronze';
              const isCurrentUser = currentUserId && entry._id === currentUserId;

              return (
                <div key={entry._id || `${entry.name}-${rank}`} className={cardClass}>
                  <div className="podium-medal">{medal}</div>
                  <div className="podium-avatar">{getInitials(entry.name)}</div>
                  <h3>{entry.name}</h3>
                  <p>{entry.points} pts</p>
                  {isCurrentUser && <span className="leaderboard-you-badge">You</span>}
                </div>
              );
            })}
          </div>

          <div className="leaderboard-list glass-card">
            <div className="leaderboard-list-header">
              <span>Rank</span>
              <span>Reviewer</span>
              <span>Points</span>
            </div>

            {users.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = currentUserId && entry._id === currentUserId;

              return (
                <div key={entry._id || `${entry.name}-${rank}`} className={`leaderboard-row ${isCurrentUser ? 'leaderboard-row-self' : ''}`}>
                  <div className="leaderboard-rank">#{rank}</div>
                  <div className="leaderboard-user">
                    <div className="leaderboard-avatar">{getInitials(entry.name)}</div>
                    <div>
                      <div className="leaderboard-name">
                        {entry.name}
                        {isCurrentUser && <span className="leaderboard-you-pill">You</span>}
                      </div>
                      <div className="leaderboard-subtext">Community contributor</div>
                    </div>
                  </div>
                  <div className="leaderboard-points">{entry.points} pts</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;