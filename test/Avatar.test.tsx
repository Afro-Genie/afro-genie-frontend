import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Avatar from '../components/Avatar';

describe('Avatar', () => {
  it('uses initials instead of requesting an expiring Facebook CDN photo', () => {
    render(
      <Avatar
        src="https://scontent-cdg4-2.xx.fbcdn.net/v/t39.30808-1/avatar.jpg?oh=expired"
        name="Nia Soul"
        className="h-9 w-9"
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('falls back to initials when the saved profile image cannot load', () => {
    render(
      <Avatar
        src="/uploads/profile-photo.jpg"
        name="Afro Genie"
        alt="Profile"
        className="h-9 w-9"
      />,
    );

    fireEvent.error(screen.getByRole('img'));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
