"use client";

import Link from "next/link";

// The built-in manual officers see before editing. Port of the manual that used
// to live in admin.html.
export function Manual({ onStart }: { onStart: () => void }) {
  return (
    <div className="adm-help">
      <p className="help-lead">
        This editor is how the <Link href="/guide" target="_blank" rel="noopener">Guide</Link> page
        gets written. Everything you change here goes to the real site, so it is worth five minutes
        to read this once. Nothing you do can break the site permanently — every save is stored in
        the database and can be undone.
      </p>

      <div className="help-flow">
        <div>
          <b>1</b>
          <span>Edit here</span>
        </div>
        <div>
          <b>2</b>
          <span>Press Save &amp; publish</span>
        </div>
        <div>
          <b>3</b>
          <span>Live right away</span>
        </div>
      </div>

      <h2>1. Two levels: topics and sections</h2>
      <p>The guide has a main topic, and sections inside it.</p>
      <pre className="help-tree">
        {"Guide Season 3          "}
        <span>{`\u2190 a main topic`}</span>
        {"\n   \u251c\u2500\u2500 Features & Notes  "}
        <span>{`\u2190 a section`}</span>
        {"\n   \u251c\u2500\u2500 Nien\n   \u251c\u2500\u2500 The Map\n   \u2514\u2500\u2500 \u2026"}
      </pre>
      <p>
        On the site, readers pick one main topic and see only its sections. So a whole new subject —
        Season 4, alliance rules, an event guide — should be a{" "}
        <strong>new main topic</strong>. A new chapter of something that already exists should be a{" "}
        <strong>new section</strong> inside it.
      </p>
      <ul>
        <li>
          <strong>+ New main topic</strong> (bottom of the left column) starts a whole new subject.
        </li>
        <li>
          <strong>+ Add section here</strong> adds a section inside the topic you have open.
        </li>
      </ul>
      <div className="tip">
        <p>
          <strong>Menu label</strong> is what readers see in the Contents list on the left of the
          guide; <strong>Title</strong> is the big heading in the page itself. They are usually
          similar — the menu label is just shorter, e.g. title <em>&ldquo;Season policies&rdquo;</em>, menu label{" "}
          <em>&ldquo;5 · Season Policies&rdquo;</em>.
        </p>
      </div>

      <div className="tip">
        <p>
          <strong>Description</strong> is the two or three lines shown at the top of the
          topic on the site, before its first section. Write what the topic covers;
          leave it blank if the topic title already says enough.
        </p>
      </div>

      <h2>2. A section is built from blocks</h2>
      <p>
        Inside a section you stack blocks. Use the buttons at the bottom of the page to add one. Each
        block has <span className="help-key">▲</span> <span className="help-key">▼</span> to move it
        and <span className="help-key">×</span> to delete it.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Block</th>
              <th>Use it for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Paragraph</strong>
              </td>
              <td>Ordinary text. Most of the guide is this.</td>
            </tr>
            <tr>
              <td>
                <strong>Heading</strong>
              </td>
              <td>
                Splits a long section. Tick <em>small note-style</em> for a minor heading like
                &ldquo;Note 1 — …&rdquo;.
              </td>
            </tr>
            <tr>
              <td>
                <strong>List</strong>
              </td>
              <td>
                Bullets, or numbered steps. One item per line — do not type the bullet or the number.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Callout box</strong>
              </td>
              <td>
                One thing you want nobody to miss. Tick <em>red warning style</em> for &ldquo;do not do
                this&rdquo; advice.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Choice cards</strong>
              </td>
              <td>
                When the game gives options and one is right. Tick <em>recommended</em> on the good
                one and it gets the orange border.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Images</strong>
              </td>
              <td>Screenshots. See below.</td>
            </tr>
            <tr>
              <td>
                <strong>Table</strong>
              </td>
              <td>
                Comparisons. Separate the columns with the <span className="help-key">|</span> key,
                one row per line.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Embed</strong>
              </td>
              <td>
                A video that plays right on the page. Paste the video&rsquo;s page link — YouTube, Vimeo,
                Twitch, Dailymotion or a direct&nbsp;.mp4 file all work.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="tip">
        <p>
          <strong>Video pastes as a link, plays in place.</strong> Add an <strong>Embed</strong> block
          and paste a YouTube or Vimeo page link — readers never leave the guide to watch. For other
          sites, use their embed/share URL (the one for posting into a blog) if a plain page link
          shows an empty box.
        </p>
      </div>
      <div className="tip">
        <p>
          <strong>Use callout boxes sparingly.</strong> If half the page is a callout box, none of it
          stands out any more.
        </p>
      </div>

      <h2>3. Adding screenshots</h2>
      <ol>
        <li>Add an <strong>Images</strong> block.</li>
        <li>Drag a picture onto the dashed box — or click it and pick a file.</li>
        <li>Wait for the thumbnail. That means it uploaded.</li>
        <li>Fill in the <strong>Caption</strong>, which is the line printed under the image.</li>
      </ol>
      <p>
        You do not need to shrink pictures first. Big phone screenshots are resized automatically
        before they are sent, so the guide stays fast for people reading on mobile data.
      </p>
      <p>
        <strong>Layout</strong> changes how the pictures sit on the page. Pick by shape:
      </p>
      <div className="choices">
        <div className="choice">
          <b>Side by side</b>
          <span>Two or three related shots of a similar size.</span>
        </div>
        <div className="choice">
          <b>Single, medium</b>
          <span>One picture that does not need close inspection.</span>
        </div>
        <div className="choice good">
          <b>Single, full width</b>
          <span>A detailed screenshot with small text or numbers to read. Use this one when in doubt.</span>
        </div>
        <div className="choice">
          <b>Narrow</b>
          <span>Tall portrait pictures, so they do not tower over everything else.</span>
        </div>
      </div>
      <div className="tip">
        <p>
          <strong>Alt text</strong> describes the picture for people using a screen reader, and shows
          if the image ever fails to load. One plain sentence is enough: &ldquo;Policy screen with the
          elixir speed option circled&rdquo;.
        </p>
      </div>

      <h2>4. Bold and italic</h2>
      <p>
        Select the words you want to change, then press <span className="help-key">B</span> or{" "}
        <span className="help-key">I</span> above the text box. You never need to type any code. Bold
        a few key words per paragraph — bolding whole paragraphs makes them harder to read, not
        easier.
      </p>

      <h2>5. Check before you publish</h2>
      <p>
        <strong>Preview</strong> in the top bar shows the topic exactly as readers will see it. Use it
        before every save, especially after adding images or a table. The Home tab previews the whole
        home page.
      </p>

      <h2>6. Publishing</h2>
      <p>
        The top bar tells you where you stand. <em>Loaded</em> means nothing has changed.{" "}
        <strong className="help-dirty">Unsaved changes</strong> means your work exists only in this
        browser — close the tab now and it is gone.
      </p>
      <p>
        Press <strong>Save &amp; publish</strong>. Your change appears on the site right away. Refresh
        the guide or home page to see it.
      </p>
      <div className="tip">
        <p>
          <strong>Save often.</strong> Many small saves are easier to undo than one huge one.
        </p>
      </div>

      <h2>7. If two officers edit at once</h2>
      <p>
        If someone else saved while you were working, your save is refused and you will see a message
        asking you to reload. This is deliberate: it protects their work from being overwritten by
        yours.
      </p>
      <ol>
        <li>Copy your new text somewhere safe — a note, a chat message to yourself.</li>
        <li>Reload the page to get their version.</li>
        <li>Put your changes back in and save again.</li>
      </ol>
      <p>The simplest way to avoid this: say in the officer chat when you are about to edit.</p>

      <h2>8. Moving and deleting</h2>
      <ul>
        <li>
          <span className="help-key">▲</span> <span className="help-key">▼</span> reorder blocks,
          sections and topics.
        </li>
        <li>
          <strong>Move to topic</strong> (on the Section card) moves a whole section to another main
          topic. It only appears when more than one topic exists.
        </li>
        <li>
          <span className="help-key">×</span> deletes. You are always asked to confirm first.
        </li>
      </ul>
      <div className="tip warn">
        <p>
          <strong>Deleting a main topic deletes every section inside it.</strong> If you are not
          certain, publish nothing and ask first — there is no version history in the database, so a
          deleted topic can only be restored from a git backup.
        </p>
      </div>

      <h2>9. If something goes wrong</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>What you see</th>
              <th>What it means</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Wrong password</td>
              <td>Check for a stray space. The password is case sensitive.</td>
            </tr>
            <tr>
              <td>Someone else saved changes…</td>
              <td>See part 7 above.</td>
            </tr>
            <tr>
              <td>An image will not upload</td>
              <td>
                It must be PNG, JPG, WEBP or GIF. A file that is not really a picture — a PDF
                renamed, for instance — is refused.
              </td>
            </tr>
            <tr>
              <td>The file is too big to send</td>
              <td>
                Rare, since images are shrunk automatically. Save it as a JPG and try again.
              </td>
            </tr>
            <tr>
              <td>Could not save…</td>
              <td>
                Check your internet, then try once more. If it keeps failing, the site owner needs to
                look at the server settings.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>10. Habits worth keeping</h2>
      <ul>
        <li>
          <strong>Write for someone who just joined.</strong> If it needs knowledge they do not have
          yet, explain it or link it.
        </li>
        <li>
          <strong>Say what to do, not only what exists.</strong> &ldquo;Always take the speed option&rdquo; beats
          &ldquo;there is a speed option&rdquo;.
        </li>
        <li>
          <strong>One screenshot beats a paragraph</strong> describing a screen.
        </li>
        <li>
          <strong>Keep it current.</strong> Outdated advice is worse than no advice — when a season
          ends, fix it or remove it.
        </li>
        <li>
          <strong>Sign out</strong> when you are done on a shared or public computer.
        </li>
      </ul>

      <p className="help-end">
        That is everything. Press <strong>Start editing</strong> below whenever you are ready — you can
        come back here any time with <strong>How to use this editor</strong> in the menu on the left.
      </p>
      <button type="button" className="btn-sm primary" onClick={onStart} style={{ marginTop: 20 }}>
        Start editing &rarr;
      </button>
    </div>
  );
}