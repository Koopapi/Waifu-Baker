"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { getDict } from "@/i18n/server";
import { now } from "@/server/clock";
import type { ModerationReason } from "@/domain/collection/moderation";
import { approveReview, hideAlbum, rejectReview } from "@/server/services/moderation";

const paths = (userId: string) => ["/admin/albumes", `/admin/albumes/${userId}`];

/** Spec 012, RF-4: oculta un álbum público con motivo y nota. */
export async function hideAlbumAction(userId: string, reason: ModerationReason, note: string): Promise<ActionState> {
  return adminAction("hideAlbum", paths(userId), async ({ db, actorId }) => {
    await hideAlbum(db, actorId, { userId, reason, note, now: now() });
    return (await getDict()).admin.albums.hidden;
  });
}

/** RF-11: aprueba la revisión y vuelve a publicar el álbum. */
export async function approveReviewAction(userId: string): Promise<ActionState> {
  return adminAction("approveReview", paths(userId), async ({ db, actorId }) => {
    await approveReview(db, actorId, { userId, now: now() });
    return (await getDict()).admin.albums.approved;
  });
}

/** RF-12: rechaza la revisión con una nota opcional. */
export async function rejectReviewAction(userId: string, note: string): Promise<ActionState> {
  return adminAction("rejectReview", paths(userId), async ({ db, actorId }) => {
    await rejectReview(db, actorId, { userId, note, now: now() });
    return (await getDict()).admin.albums.rejected;
  });
}
