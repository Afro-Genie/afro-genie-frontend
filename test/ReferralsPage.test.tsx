import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReferralsPage from '@/pages/ReferralsPage';
import { tokenApi, type ReferralInfo } from '@/services/tokenService';

/**
 * The referral page claimed to work while the referral route was wrong
 * (`/referrals` instead of `/referrals/me`) and the code response was read as
 * `referralCode` when the API returns `code` — so a user with no code yet saw
 * "Generating code..." forever and one whose load failed saw an empty page.
 * These cover the three states that used to be silent: generated code, failed
 * generation, and a failed load with retry.
 */

vi.mock('@/services/tokenService', () => ({
  tokenApi: {
    getMyReferrals: vi.fn(),
    getReferralCode: vi.fn(),
    applyReferral: vi.fn(),
  },
}));

const api = vi.mocked(tokenApi);

const referralInfo = (referralCode: string | null): ReferralInfo => ({
  referralCode,
  totalReferrals: 0,
  referrals: [],
});

beforeEach(() => {
  api.getMyReferrals.mockReset();
  api.getReferralCode.mockReset();
  api.applyReferral.mockReset();
});

describe('ReferralsPage', () => {
  it('renders the referral code with a copy button', async () => {
    api.getMyReferrals.mockResolvedValue(referralInfo('AGTEST1234'));

    render(<ReferralsPage />);

    expect(await screen.findByText('AGTEST1234')).toBeTruthy();
    expect(screen.getByRole('button', { name: /copy/i })).toBeTruthy();
    // A user who already has a code must not be asked to generate one.
    expect(screen.queryByRole('button', { name: /generate referral code/i })).toBeNull();
  });

  it('generates a code for a user who has none and then displays it', async () => {
    api.getMyReferrals
      .mockResolvedValueOnce(referralInfo(null))
      .mockResolvedValueOnce(referralInfo('AGNEW9999'));
    api.getReferralCode.mockResolvedValue({ code: 'AGNEW9999' });

    render(<ReferralsPage />);

    expect(await screen.findByText('AGNEW9999')).toBeTruthy();
    expect(api.getReferralCode).toHaveBeenCalledTimes(1);
    expect(api.getMyReferrals).toHaveBeenCalledTimes(2);
  });

  it('offers a generate button when code creation fails instead of spinning forever', async () => {
    api.getMyReferrals.mockResolvedValue(referralInfo(null));
    api.getReferralCode.mockRejectedValue(new Error('boom'));

    render(<ReferralsPage />);

    const generate = await screen.findByRole('button', { name: /generate referral code/i });
    expect(screen.getByText('boom')).toBeTruthy();

    api.getReferralCode.mockResolvedValue({ code: 'AGRECOVERED1' });
    api.getMyReferrals.mockResolvedValue(referralInfo('AGRECOVERED1'));
    fireEvent.click(generate);

    expect(await screen.findByText('AGRECOVERED1')).toBeTruthy();
  });

  it('shows a retry button when loading fails, and retrying recovers', async () => {
    api.getMyReferrals.mockRejectedValueOnce(new Error('network down'));

    render(<ReferralsPage />);

    expect(await screen.findByText('network down')).toBeTruthy();
    const retry = screen.getByRole('button', { name: /try again/i });
    expect(api.getReferralCode).not.toHaveBeenCalled();

    api.getMyReferrals.mockResolvedValue(referralInfo('AGRETRY0001'));
    fireEvent.click(retry);

    expect(await screen.findByText('AGRETRY0001')).toBeTruthy();
    expect(screen.queryByText('network down')).toBeNull();
  });

  it('applies a friend code and reports the outcome', async () => {
    api.getMyReferrals.mockResolvedValue(referralInfo('AGMINE0001'));
    api.applyReferral.mockResolvedValue({ success: true, message: 'Referral applied!' });

    render(<ReferralsPage />);

    const input = await screen.findByPlaceholderText('Enter referral code');
    fireEvent.change(input, { target: { value: 'AFRIEND42' } });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    await waitFor(() => expect(screen.getByText('Referral applied!')).toBeTruthy());
    expect(api.applyReferral).toHaveBeenCalledWith('AFRIEND42');
  });
});
