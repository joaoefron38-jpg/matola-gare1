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

- Share school branding reads through the React Query cache so navigation does not repeatedly request the same logo and name.
- Keep admin chat messages newest-first in the database query and reverse only the bounded result for display, so active conversations retain their latest messages.
- Render admin child content only after role loading completes, while preserving the parent route Outlet for nested navigation.
