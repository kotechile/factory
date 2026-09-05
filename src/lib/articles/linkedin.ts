export interface LinkedInPublishOptions {
  text: string;
  accessToken: string;
  authorUrn: string;
  linkUrl?: string;
  linkTitle?: string;
}

export interface LinkedInPublishResult {
  success: boolean;
  postUrn?: string;
  publishedAt?: string;
  error?: string;
}

/**
 * Publishes a formatted post directly to LinkedIn via the UGC Post API.
 */
export async function publishToLinkedInApi(options: LinkedInPublishOptions): Promise<LinkedInPublishResult> {
  const { text, accessToken, authorUrn, linkUrl, linkTitle } = options;

  if (!accessToken || !authorUrn) {
    return {
      success: false,
      error: "Missing LinkedIn Access Token or Author URN. Please configure them in Settings.",
    };
  }

  // Ensure author URN format (e.g. urn:li:person:XXXX or urn:li:organization:XXXX)
  const normalizedAuthor = authorUrn.startsWith("urn:li:")
    ? authorUrn
    : `urn:li:person:${authorUrn}`;

  // Structure UGC Post Payload
  const shareContent: Record<string, unknown> = {
    shareCommentary: {
      text: text,
    },
    shareMediaCategory: linkUrl ? "ARTICLE" : "NONE",
  };

  if (linkUrl) {
    shareContent.media = [
      {
        status: "READY",
        description: {
          text: linkTitle || "Read the full breakdown",
        },
        originalUrl: linkUrl,
        title: {
          text: linkTitle || "Article Breakdown",
        },
      },
    ];
  }

  const payload = {
    author: normalizedAuthor,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": shareContent,
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  try {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `LinkedIn API error (Status ${response.status}): ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.message) errorMsg = parsed.message;
      } catch {
        errorMsg = errorText || errorMsg;
      }
      return {
        success: false,
        error: errorMsg,
      };
    }

    const data = await response.json();
    const postUrn = data.id || `urn:li:share:${Date.now()}`;

    return {
      success: true,
      postUrn,
      publishedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Network error contacting LinkedIn";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Builds a universal web intent URL for sharing to LinkedIn directly in browser.
 */
export function buildLinkedInShareUrl(text: string, url?: string): string {
  const base = "https://www.linkedin.com/feed/?shareActive=true";
  const params = new URLSearchParams();
  if (text) {
    params.set("text", text);
  }
  if (url) {
    params.set("url", url);
  }
  return `${base}&${params.toString()}`;
}
