import "server-only";

import type { AuthenticatedActor } from "@/lib/auth/policy";
import { getPostgresClient } from "@/lib/db";
import { InjectionRecordError } from "@/lib/injection/service";
import {
  calculateInjectionSiteRotation,
  type InjectionSiteHistoryItem,
} from "@/lib/injection/rotation";
import {
  injectionSites,
  isInjectionSiteId,
  type InjectionSiteId,
} from "@/lib/injection/sites";
import { parseCalendarDate } from "@/lib/protocol-calendar/service";

export async function getDisabledInjectionSiteIds(actor: AuthenticatedActor) {
  const sql = getPostgresClient();
  const rows = await sql<{ injectionSiteId: InjectionSiteId }[]>`
    select injection_site_id as "injectionSiteId"
    from member_injection_site_preference
    where owner_user_id = ${actor.userId}
    order by injection_site_id
  `;
  return rows.map((row) => row.injectionSiteId);
}

export async function updateDisabledInjectionSiteIds(
  actor: AuthenticatedActor,
  disabledSiteIds: string[],
) {
  const unique = [...new Set(disabledSiteIds)];
  if (unique.some((siteId) => !isInjectionSiteId(siteId))) {
    throw new InjectionRecordError("Choose valid injection sites.", "invalid");
  }
  const sql = getPostgresClient();
  await sql.begin(async (transaction) => {
    await transaction`
      delete from member_injection_site_preference where owner_user_id = ${actor.userId}
    `;
    for (const siteId of unique) {
      await transaction`
        insert into member_injection_site_preference (owner_user_id, injection_site_id)
        values (${actor.userId}, ${siteId})
      `;
    }
  });
}

export async function getInjectionSiteRotation(
  actor: AuthenticatedActor,
  asOfDate: string,
  options: { asOfTime?: string; excludeRecordId?: string } = {},
) {
  parseCalendarDate(asOfDate);
  const asOfTime = options.asOfTime ?? "23:59";
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(asOfTime)) {
    throw new InjectionRecordError("Rotation time must be valid.", "invalid");
  }
  const sql = getPostgresClient();
  const history = await sql<InjectionSiteHistoryItem[]>`
    select record.id as "recordId", injection_site_id as "injectionSiteId",
      actual_date::text as "actualDate", to_char(actual_time, 'HH24:MI') as "actualTime",
      actual_volume_ml::text as "actualVolumeMl", catalogue.display_name as "peptideName"
    from injection_record record
    join catalogue_entry catalogue on catalogue.id = record.catalogue_entry_id
    where record.owner_user_id = ${actor.userId}
      and status = 'completed'
      and injection_site_id is not null
      and (actual_date < ${asOfDate}::date or (actual_date = ${asOfDate}::date and actual_time <= ${asOfTime}::time))
      and (${options.excludeRecordId ?? null}::text is null or record.id <> ${options.excludeRecordId ?? null})
    order by actual_date, actual_time, record.id
  `;
  const disabledSiteIds = await getDisabledInjectionSiteIds(actor);
  const disabled = new Set(disabledSiteIds);
  const candidateSiteIds = injectionSites
    .map((site) => site.id)
    .filter((siteId) => !disabled.has(siteId));
  return {
    ...calculateInjectionSiteRotation({ asOfDate, candidateSiteIds, history }),
    disabledSiteIds,
  };
}
