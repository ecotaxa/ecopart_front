import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import {
    getBroadcastMessage,
    setBroadcastMessage,
    deleteBroadcastMessage,
    type BroadcastMessage,
} from './broadcastMessages.api';

// ---------------------------------------------------------------------------
// API-layer tests for the site-wide broadcast (/broadcast_messages). These run
// the real http/httpText helpers against MSW, so they pin down the wire
// contract the store relies on — most importantly getBroadcastMessage's
// "empty/blank body ⇒ null" handling, since the endpoint answers 200 with an
// empty body when no message is set (http() would throw on that; httpText does
// not). Continues the AU (Admin — Updates) area numbering.
// ---------------------------------------------------------------------------
const broadcast: BroadcastMessage = {
    broadcast_message_id: 1,
    message: 'Downtime tonight',
    sub_message: 'Please disconnect',
    level: 'warning',
    created_by_user_id: 42,
    message_creation_utc_date_time: '2026-07-20T21:30:00.000Z',
};

describe('broadcastMessages API (AU)', () => {
    it('TC-AU19: getBroadcastMessage GETs /broadcast_messages and returns the parsed row', async () => {
        let path = '';
        server.use(
            http.get('*/broadcast_messages', ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json(broadcast);
            }),
        );

        await expect(getBroadcastMessage()).resolves.toEqual(broadcast);
        expect(path).toBe('/broadcast_messages');
    });

    it('TC-AU19b: getBroadcastMessage returns null for an empty, blank, "null", or unparseable body', async () => {
        // Empty body (200) — the "no message set" case the endpoint really sends.
        server.use(http.get('*/broadcast_messages', () => HttpResponse.text('')));
        await expect(getBroadcastMessage()).resolves.toBeNull();

        // Whitespace-only body.
        server.use(http.get('*/broadcast_messages', () => HttpResponse.text('   ')));
        await expect(getBroadcastMessage()).resolves.toBeNull();

        // Literal JSON null.
        server.use(http.get('*/broadcast_messages', () => HttpResponse.text('null')));
        await expect(getBroadcastMessage()).resolves.toBeNull();

        // Malformed JSON is swallowed rather than thrown (banner is best-effort).
        server.use(http.get('*/broadcast_messages', () => HttpResponse.text('{not json')));
        await expect(getBroadcastMessage()).resolves.toBeNull();
    });

    it('TC-AU20: setBroadcastMessage POSTs the input body and returns the stored row', async () => {
        let method = '';
        let path = '';
        let body: unknown;
        server.use(
            http.post('*/broadcast_messages', async ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                body = await request.json();
                return HttpResponse.json(broadcast);
            }),
        );

        const input = { message: 'Downtime tonight', sub_message: 'Please disconnect', level: 'warning' as const };
        await expect(setBroadcastMessage(input)).resolves.toEqual(broadcast);
        expect(method).toBe('POST');
        expect(path).toBe('/broadcast_messages');
        expect(body).toEqual(input);
    });

    it('TC-AU21: deleteBroadcastMessage sends DELETE /broadcast_messages', async () => {
        let method = '';
        let path = '';
        server.use(
            http.delete('*/broadcast_messages', ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                return HttpResponse.json({ message: 'cleared' });
            }),
        );

        await expect(deleteBroadcastMessage()).resolves.toBeUndefined();
        expect(method).toBe('DELETE');
        expect(path).toBe('/broadcast_messages');
    });
});
