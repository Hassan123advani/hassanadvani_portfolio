/**
 * Starter articles for the Writing section. They are seeded as DRAFTS so Hassan can
 * review, personalise and publish them from the admin. Every personal fact used here
 * comes from the existing portfolio content (profile, projects, certificates) or from
 * how this website is actually built — nothing else is claimed.
 */
const AH_COVER = {
  url: 'https://res.cloudinary.com/js8eyyz5/image/upload/v1794646702/portfolio/projects/ahclothinghub.png',
  publicId: 'portfolio/projects/ahclothinghub',
  alt: 'AH Clothing Hub storefront home page with the winter collection hero',
  caption: '',
  width: 1440,
  height: 960,
  resourceType: 'image',
};

export const starterArticles = [
  {
    title: 'My Journey Into Web Development',
    slug: 'my-journey-into-web-development',
    coverImage: {url: "https://res.cloudinary.com/js8eyyz5/image/upload/v1794648973/portfolio/posts/my-journey-into-web-development-cover.png", publicId: "portfolio/posts/my-journey-into-web-development-cover", alt: "Illustrated timeline from Iqra Huffaz Boys School and Fatmiyah Boys College to a BSCS at GU Tech, with HTML, CSS, JavaScript, Python and C chips", caption: "", width: 1600, height: 840, resourceType: "image"},
    subtitle: 'From my first HTML page to full-stack projects — what I’m learning as a computer science student.',
    excerpt: 'How I got started with HTML, CSS and JavaScript, what I’m studying in my BSCS, and the habits that help me keep building.',
    category: 'My Journey',
    tags: ['learning', 'web development', 'bscs'],
    seoKeywords: ['web development journey', 'computer science student', 'learning to code'],
    content: `
<p>Every developer’s story starts somewhere. Mine starts with a simple question: <em>how do websites actually work?</em> This journal is where I write down what I learn while answering it — one project at a time.</p>
<h2>Where I am today</h2>
<p>I’m studying for a Bachelor of Science in Computer Science (BSCS) at GU Tech. My schooling began at Iqra Huffaz Boys School and continued at Fatmiyah Boys College, and now university is where theory and practice finally meet.</p>
<p>My coursework covers programming fundamentals, data structures, algorithms, databases and software engineering. Outside class, I build for the web.</p>
<h2>The tools I learn with</h2>
<table><thead><tr><th>Area</th><th>What I use</th></tr></thead><tbody>
<tr><td>Web</td><td>HTML5, CSS3, JavaScript</td></tr>
<tr><td>Programming languages</td><td>Python, C, C++</td></tr>
<tr><td>Tools</td><td>VS Code, Dev-C++ / Code::Blocks, Git &amp; GitHub</td></tr>
</tbody></table>
<h2>Learning by building</h2>
<p>Reading tutorials only takes you so far. The things that stuck were the ones I built myself:</p>
<ul>
<li><strong>Simple Calculator</strong> — event handling and evaluating expressions in JavaScript.</li>
<li><strong>Periodic Table</strong> — a large, data-heavy layout using only HTML and CSS.</li>
<li><strong>FocusFlow, BudgetWise and CoursePilot</strong> — small apps that taught me state, Local Storage and organising a bigger interface.</li>
</ul>
<p>Each project connects something from class to a real problem, and each one shows me what to learn next.</p>
<h2>What I’m focusing on next</h2>
<p>Right now my focus is on strong fundamentals: data structures, algorithms and problem solving. I’m also exploring artificial intelligence and learning databases and backend development.</p>
<blockquote><p>The goal isn’t to know everything — it’s to keep building things that are a little harder than the last one.</p></blockquote>
<p>If you’re on a similar path, I hope these notes help. Thanks for reading.</p>`,
  },
  {
    title: 'Learning C Programming: My Beginner Experience',
    slug: 'learning-c-programming-beginner-experience',
    coverImage: {url: "https://res.cloudinary.com/js8eyyz5/image/upload/v1794648981/portfolio/posts/learning-c-programming-beginner-experience-cover.png", publicId: "portfolio/posts/learning-c-programming-beginner-experience-cover", alt: "C code editor showing a sum_to function, a terminal printing 55 and a pointer diagram", caption: "", width: 1600, height: 840, resourceType: "image"},
    subtitle: 'Why C is worth learning early, the first concepts that matter, and tips for getting through the hard parts.',
    excerpt: 'Notes from learning C as a computer science student: compiling, variables, loops, functions and the infamous pointers.',
    category: 'C Programming',
    tags: ['c', 'programming fundamentals', 'beginners'],
    seoKeywords: ['learn C programming', 'C for beginners', 'pointers in C'],
    content: `
<p>C was one of the first languages I studied in depth, and it changed how I think about programming. It’s small, strict and close to the machine — which is exactly why it teaches so much.</p>
<h2>Why learn C at all?</h2>
<ul>
<li>It shows you what higher-level languages hide: memory, types and how data is laid out.</li>
<li>Many languages (C++, Java, JavaScript) borrow its syntax, so the basics transfer.</li>
<li>It makes data structures and algorithms feel concrete.</li>
</ul>
<h2>Your first program</h2>
<p>I wrote my early programs in Dev-C++ and Code::Blocks. Everything starts with <code>main</code>:</p>
<pre><code class="language-c">#include &lt;stdio.h&gt;

int main(void) {
    printf("Hello, world!\\n");
    return 0;
}</code></pre>
<p>Compile it, run it, and you’ve completed the whole cycle: write → compile → run → fix.</p>
<h2>Loops and functions</h2>
<p>Once input and output make sense, loops and functions turn short scripts into real programs:</p>
<pre><code class="language-c">#include &lt;stdio.h&gt;

int sum_to(int n) {
    int total = 0;
    for (int i = 1; i &lt;= n; i++) {
        total += i;
    }
    return total;
}

int main(void) {
    int n;
    printf("Enter a number: ");
    scanf("%d", &amp;n);
    printf("Sum from 1 to %d is %d\\n", n, sum_to(n));
    return 0;
}</code></pre>
<h2>Pointers: the part everyone warns you about</h2>
<p>A pointer is just a variable that stores a memory address. Drawing boxes and arrows on paper helped me more than anything else:</p>
<pre><code class="language-c">int x = 10;
int *p = &amp;x;   // p holds the address of x
*p = 20;        // change x through the pointer
printf("%d\\n", x); // prints 20</code></pre>
<blockquote><p>If pointers confuse you, slow down and trace every line by hand. It clicks eventually.</p></blockquote>
<h2>Tips that helped me</h2>
<ol>
<li>Read compiler errors from the top — the first one usually causes the rest.</li>
<li>Write tiny programs that test one idea at a time.</li>
<li>Print values often while you’re learning; it’s the simplest debugger.</li>
<li>Re-implement the same exercise in Python or C++ to see what changes.</li>
</ol>
<p>C is demanding, but the fundamentals it teaches show up in every other language I use.</p>`,
  },
  {
    title: 'Building an E-commerce Website From Scratch',
    slug: 'building-an-ecommerce-website-from-scratch',
    subtitle: 'What goes into an online clothing store for Pakistan — catalog, search, images and local payments.',
    excerpt: 'A look at the pieces behind AH Clothing Hub: categories, product pages, search, wishlist, optimised images and Cash on Delivery.',
    category: 'Web Development',
    tags: ['ecommerce', 'nextjs', 'cloudinary', 'vercel'],
    seoKeywords: ['build ecommerce website', 'online clothing store Pakistan', 'Next.js store'],
    coverImage: AH_COVER,
    content: `
<p>AH Clothing Hub is an online clothing store based in Karachi that delivers across Pakistan. Building a store is a great way to learn because it touches almost everything: layout, data, images, search and payments.</p>
<h2>Start with how people shop</h2>
<p>Before writing code, I listed what a shopper needs to do:</p>
<ul>
<li>Browse by category — Men, Women and Unisex wear, plus New In and Sale.</li>
<li>Search for a product by name.</li>
<li>Open a product page with photos and price.</li>
<li>Save items to a wishlist and sign in to an account.</li>
<li>Pay in a way that works locally.</li>
</ul>
<h2>The building blocks</h2>
<table><thead><tr><th>Need</th><th>How the store handles it</th></tr></thead><tbody>
<tr><td>Pages and routing</td><td>Next.js, with a page for each product</td></tr>
<tr><td>Product images</td><td>Served from Cloudinary and optimised through Next.js images</td></tr>
<tr><td>Hosting</td><td>Deployed on Vercel</td></tr>
<tr><td>Payments</td><td>Cash on Delivery, JazzCash and EasyPaisa</td></tr>
</tbody></table>
<h2>Designing for local customers</h2>
<p>Online shoppers in Pakistan often prefer paying when the parcel arrives, so Cash on Delivery is front and centre, next to JazzCash and EasyPaisa. The store also offers free delivery on orders above Rs. 5,000 and easy exchanges — small details that build trust.</p>
<h2>Images make or break a fashion store</h2>
<p>Clothing sells through photos, but large photos slow pages down. Hosting them on Cloudinary means each image can be resized and converted to modern formats automatically, so the home page stays fast even with a full-width hero slideshow.</p>
<h2>Little things that feel premium</h2>
<ul>
<li>A seasonal hero slideshow (“Winter Edit”).</li>
<li>“New” and sale badges with the discount shown on the card.</li>
<li>A WhatsApp chat button for quick questions.</li>
<li>Help pages for order tracking, returns &amp; exchange and FAQs.</li>
</ul>
<blockquote><p>An online store is never “finished”. Each section is a chance to learn something new about users and performance.</p></blockquote>
<p>You can visit the live store at <a href="https://ahclothinghub.vercel.app">ahclothinghub.vercel.app</a>.</p>`,
  },
  {
    title: 'Understanding Firebase in Modern Web Applications',
    slug: 'understanding-firebase-in-modern-web-applications',
    coverImage: {url: "https://res.cloudinary.com/js8eyyz5/image/upload/v1794648984/portfolio/posts/understanding-firebase-in-modern-web-applications-cover.png", publicId: "portfolio/posts/understanding-firebase-in-modern-web-applications-cover", alt: "Diagram of a browser, a server API that verifies tokens, and Firestore, with a security rules snippet", caption: "", width: 1600, height: 840, resourceType: "image"},
    subtitle: 'Firestore, Authentication and security rules — explained through how this portfolio uses them.',
    excerpt: 'What Firebase gives you, how Firestore stores data, and why security rules and a trusted backend matter more than anything else.',
    category: 'Firebase',
    tags: ['firebase', 'firestore', 'security', 'backend'],
    seoKeywords: ['Firebase tutorial', 'Firestore security rules', 'Firebase Admin SDK'],
    content: `
<p>Firebase is a set of backend services from Google. Instead of setting up servers and databases yourself, you get hosted building blocks you can use straight from your app. This website uses it, so here’s how the pieces fit together.</p>
<h2>The services this site uses</h2>
<ul>
<li><strong>Cloud Firestore</strong> — a document database. Articles, projects, certificates and messages each live in their own collection.</li>
<li><strong>Firebase Authentication</strong> — admin sign-in for the content dashboard.</li>
<li><strong>Firebase Admin SDK</strong> — used by the server API to read and write data on behalf of verified admins.</li>
</ul>
<h2>Documents and collections</h2>
<p>Firestore stores data as documents grouped into collections. A blog article is just a document:</p>
<pre><code class="language-json">{
  "title": "Understanding Firebase",
  "slug": "understanding-firebase",
  "status": "draft",
  "category": "Firebase",
  "tags": ["firestore", "security"]
}</code></pre>
<h2>Security rules are the real backend</h2>
<p>If a browser can talk to your database, you must decide exactly what it’s allowed to do. On this site, visitors can only read content that is published, and nobody can write from the browser at all:</p>
<pre><code class="language-javascript">match /posts/{id} {
  allow read: if isLive() || can('blog');
  allow write: if false;
}</code></pre>
<p>All changes go through the server API, which verifies the admin’s Firebase ID token and their permissions before using the Admin SDK.</p>
<h2>Never trust the frontend</h2>
<blockquote><p>Hiding a button is not security. Anything that matters — who is an admin, how many views an article has — must be checked on the server.</p></blockquote>
<p>That’s why article view counts here are increased by a server endpoint, not by the browser. A visitor can’t simply send “views: 1000”.</p>
<h2>Keep secrets on the server</h2>
<ul>
<li>The Firebase <em>web config</em> is public by design — it only identifies the project.</li>
<li>The <em>service account</em> key used by the Admin SDK is private and lives only in server environment variables.</li>
</ul>
<p>Firebase makes it quick to get started, but the habits — strict rules, server-side checks, private keys — are what make an app safe.</p>`,
  },
  {
    title: 'How Cloudinary Helps Manage Website Images',
    slug: 'how-cloudinary-helps-manage-website-images',
    coverImage: {url: "https://res.cloudinary.com/js8eyyz5/image/upload/v1794648987/portfolio/posts/how-cloudinary-helps-manage-website-images-cover.png", publicId: "portfolio/posts/how-cloudinary-helps-manage-website-images-cover", alt: "A large photo passing through Cloudinary f_auto, q_auto and resize parameters into device-sized WebP or AVIF images", caption: "", width: 1600, height: 840, resourceType: "image"},
    subtitle: 'Uploading, resizing and delivering images without slowing the website down.',
    excerpt: 'Why images are usually the heaviest part of a page, and how Cloudinary’s signed uploads and URL transformations keep them fast.',
    category: 'Technology',
    tags: ['cloudinary', 'images', 'performance'],
    seoKeywords: ['Cloudinary tutorial', 'image optimization', 'f_auto q_auto'],
    content: `
<p>Images are often the heaviest part of a web page. A single photo straight from a phone can be several megabytes. Cloudinary solves this by storing images and transforming them on the fly.</p>
<h2>Uploading safely</h2>
<p>On this website, files are uploaded from the admin dashboard straight to Cloudinary — but only with a <strong>signature</strong> from the server. The API secret never reaches the browser:</p>
<ol>
<li>The admin picks a file.</li>
<li>The server checks their permissions and signs the upload.</li>
<li>The browser uploads directly to Cloudinary.</li>
<li>The server confirms the file exists and records it in the media library.</li>
</ol>
<h2>Transformations in the URL</h2>
<p>Cloudinary changes an image just by adding parameters to its URL:</p>
<pre><code class="language-bash">https://res.cloudinary.com/&lt;cloud&gt;/image/upload/f_auto,q_auto,w_700,h_420,c_fill/portfolio/posts/cover.jpg</code></pre>
<table><thead><tr><th>Parameter</th><th>What it does</th></tr></thead><tbody>
<tr><td><code>f_auto</code></td><td>Serves a modern format (such as WebP or AVIF) the browser supports</td></tr>
<tr><td><code>q_auto</code></td><td>Picks a sensible compression level automatically</td></tr>
<tr><td><code>w_700,h_420</code></td><td>Resizes to the size actually displayed</td></tr>
<tr><td><code>c_fill</code></td><td>Crops to fill those dimensions</td></tr>
</tbody></table>
<h2>Responsive images</h2>
<p>Phones don’t need desktop-sized images. With <code>srcset</code>, the browser chooses the right width:</p>
<pre><code class="language-xml">&lt;img
  src="…/w_1400/photo.jpg"
  srcset="…/w_640/photo.jpg 640w, …/w_960/photo.jpg 960w, …/w_1400/photo.jpg 1400w"
  sizes="(max-width: 760px) 100vw, 720px"
  alt="Describe the image"
  loading="lazy"&gt;</code></pre>
<h2>Don’t forget alt text</h2>
<blockquote><p>Fast images matter, but so does accessibility. Every meaningful image needs alt text that describes it.</p></blockquote>
<p>Good image handling is one of the easiest ways to make a site feel faster — and Cloudinary does most of the work.</p>`,
  },
  {
    title: 'Building Projects With AI Coding Assistants',
    slug: 'building-projects-with-ai-coding-assistants',
    coverImage: {url: "https://res.cloudinary.com/js8eyyz5/image/upload/v1794648990/portfolio/posts/building-projects-with-ai-coding-assistants-cover.png", publicId: "portfolio/posts/building-projects-with-ai-coding-assistants-cover", alt: "An AI assistant chat explaining a JavaScript NaN bug, beside the tips Think first, Ask why, Test it and Own the code", caption: "", width: 1600, height: 840, resourceType: "image"},
    subtitle: 'How to use AI as a learning partner without letting it do your thinking for you.',
    excerpt: 'AI assistants can speed up building and learning — if you stay in charge. Here’s a practical way to work with them as a student.',
    category: 'Artificial Intelligence',
    tags: ['ai', 'productivity', 'learning'],
    seoKeywords: ['AI coding assistant', 'learning to code with AI', 'AI for students'],
    content: `
<p>AI coding assistants have changed how many people build software. As a student, I see them as a powerful tool — and, like any tool, it depends on how you use it.</p>
<h2>What I learned about AI first</h2>
<p>Before relying on AI tools, it helps to understand what they are. Google’s <strong>AI Essentials</strong> course, one of my certificates, covers the basics: what generative AI can do, how to write useful prompts, and why you must check its output.</p>
<h2>Where assistants genuinely help</h2>
<ul>
<li><strong>Explaining code</strong> you don’t understand yet, line by line.</li>
<li><strong>Finding bugs</strong> by describing what you expected and what happened.</li>
<li><strong>Boilerplate</strong> such as configuration files and repetitive markup.</li>
<li><strong>Reviewing</strong> your code for edge cases you missed.</li>
</ul>
<h2>Where you still have to think</h2>
<blockquote><p>An assistant can write code that looks right and is wrong. You are responsible for every line you ship.</p></blockquote>
<ul>
<li>Design decisions: what to build and why.</li>
<li>Security: secrets, permissions and validation must be checked by you.</li>
<li>Understanding: if you can’t explain the code, you haven’t learned it.</li>
</ul>
<h2>A workflow that works for learning</h2>
<ol>
<li>Try the problem yourself first, even if you get stuck.</li>
<li>Ask the assistant to explain the idea, not just give the answer.</li>
<li>Write or rewrite the solution in your own words.</li>
<li>Test it — run it, break it and fix it.</li>
</ol>
<h2>Prompting tips</h2>
<pre><code class="language-bash"># Vague
"Fix my code"

# Better
"This JavaScript function should return the sum of an array,
but it returns NaN for [1, 2, 3]. Explain why, then show the fix."</code></pre>
<p>Used well, AI makes learning faster. Used carelessly, it skips the learning entirely. The difference is staying curious and staying in control.</p>`,
  },
];
