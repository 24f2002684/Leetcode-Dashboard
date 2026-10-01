/**
 * leetcodeService.js
 * -------------------
 * SINGLE PLACE that talks to LeetCode's unofficial public GraphQL API.
 *
 * LeetCode does not offer an official public API. This module wraps the
 * GraphQL calls used by most community tools (leetcode-stats-api etc).
 * If LeetCode changes their schema/endpoint, this is the ONLY file you
 * need to touch — nothing else in the app depends on LeetCode directly.
 */

const fetch = require('node-fetch');

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

const HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://leetcode.com',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
};

// Simple delay helper so we don't hammer LeetCode's servers when
// looping over many students (avoids rate-limit / temporary IP blocks).
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function graphqlRequest(query, variables) {
  const res = await fetch(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    throw new Error(`LeetCode GraphQL HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

const PROFILE_QUERY = `
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
      reputation
      countryName
      school
      userAvatar
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
  }
}
`;

const CONTEST_QUERY = `
query userContestRankingInfo($username: String!) {
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    totalParticipants
    topPercentage
  }
  userContestRankingHistory(username: $username) {
    attended
    problemsSolved
    totalProblems
    rating
    ranking
    finishTimeInSeconds
    contest {
      title
      startTime
    }
  }
}
`;

/**
 * Fetch profile + solved-count stats for a single username.
 * Returns a normalized object. Throws if the username doesn't exist
 * or LeetCode is unreachable.
 */
async function fetchProfile(username) {
  const data = await graphqlRequest(PROFILE_QUERY, { username });

  if (!data.matchedUser) {
    throw new Error(`User "${username}" not found on LeetCode`);
  }

  const counts = data.matchedUser.submitStatsGlobal.acSubmissionNum || [];
  const byDiff = {};
  counts.forEach((c) => {
    byDiff[c.difficulty] = c.count;
  });

  return {
    username: data.matchedUser.username,
    ranking: data.matchedUser.profile.ranking ?? null,
    reputation: data.matchedUser.profile.reputation ?? null,
    country: data.matchedUser.profile.countryName || null,
    school: data.matchedUser.profile.school || null,
    avatar: data.matchedUser.profile.userAvatar || null,
    totalSolved: byDiff.All ?? 0,
    easySolved: byDiff.Easy ?? 0,
    mediumSolved: byDiff.Medium ?? 0,
    hardSolved: byDiff.Hard ?? 0
  };
}

/**
 * Fetch contest rating + full contest history for a single username.
 * Users who have never joined a contest will have null rating and an
 * empty history array (not an error).
 */
async function fetchContestData(username) {
  const data = await graphqlRequest(CONTEST_QUERY, { username });

  const ranking = data.userContestRanking; // may be null if never contested
  const history = (data.userContestRankingHistory || [])
    .filter((h) => h.attended)
    .map((h) => ({
      contestTitle: h.contest.title,
      startTime: h.contest.startTime,
      attended: 1,
      ranking: h.ranking,
      problemsSolved: h.problemsSolved,
      totalProblems: h.totalProblems,
      rating: h.rating,
      finishTimeSeconds: h.finishTimeInSeconds ?? null
    }));

  return {
    currentRating: ranking ? ranking.rating : null,
    globalRanking: ranking ? ranking.globalRanking : null,
    attendedContestsCount: ranking ? ranking.attendedContestsCount : 0,
    history
  };
}

/**
 * Fetch everything needed for one student in one call, with a small
 * built-in delay AFTER the call (caller loops over many students).
 */
async function fetchStudentData(username) {
  const profile = await fetchProfile(username);
  await sleep(250);
  const contest = await fetchContestData(username);
  return { profile, contest };
}

module.exports = {
  fetchProfile,
  fetchContestData,
  fetchStudentData,
  sleep
};
