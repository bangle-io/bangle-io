!{"type": "docs", "title": "Wordgard FAQ"}

# Frequently Asked Questions

This is where I collect answers to questions, so that I can link to it
instead of repeating myself. With luck, some people will even find the
answer before asking the question.

<hr class=floral>

### When will version 1.0 be released?

When it is done. From experience with previous projects, I've found it
very valuable to let people use the library for a while in order to
find out what parts will cause trouble, and then if necessary make
breaking changes to address that trouble. So don't hold your breath.
This might take one or two years.

<figure class="float-right" style="margin-top: 0"><img src="../../img/strawberry.jpg" alt="" style="width: 160px"></figure>

### Why don't you take pull requests?

Several reasons:

 - I am a control freak who has a hard time accepting code without
   rewriting it to fit my precise idea of the tao of the system.

 - I do not enjoy reviewing code all that much. I resent the dynamic
   of people being able to dump a bunch of annoying work in my lap
   with the implication that I'm being rude or neglectful if I don't
   act on it, along with the emotional work of tactfully turning them
   down when I don't like what they did.
 
 - Not having PRs is an effective way to nip the problem of people
   submitting LLM-generated slop code in the bud.

This is my zen garden. You are welcome to report bugs, suggest
improvements, or rage at my horrible design taste. But if you want to
have functionality that I don't feel like building and maintaining,
you're going to have to do that in a module of your own.

### Is the "social expectation" of support a threat?

No. I phrase it this way on the front page because I want to make it
clear to commercial users that expecting well-maintained open-source
components without supporting maintainers is not a sustainable
practice. But I will not go out of my way to shame companies that use
my software without funding me. Unless they piss me off in some other
way, of course.

### Don't you know TypeScript namespaces are bad for tree-shaking?

I do know, and even went so far as to add horrible hacks to the
library's build system to fix up TypeScript's 2005-era style of output
for these.

With that kludge, individual namespaces can be eliminated if not
referenced, at least by Rollup. Combined with the fact that each
namespace only wraps a coherent set of functionality that you'll
usually need as a whole, if you need it, the library should tree-shake
pretty well.

That said, since dead code elimination in JavaScript is super messy,
and the tools that library authors have to help it are ridiculously
crude, I don't know how well other tools are handling this.
