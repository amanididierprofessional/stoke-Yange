<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All shop data lives on-device in IndexedDB via Dexie (`src/lib/db.ts`); every write goes through `src/lib/actions.ts` and queues an outbox row — keeps the app fully offline and ready for later cloud sync.
- AppShell owns startup loading and local-data failure recovery; entry routes never add another splash, so native and web startup share the same experience.
- Native builds package a public-config-only SPA without a hosted server URL; Android release downloads target the workflow's explicit release tag, so prereleases resolve reliably.
