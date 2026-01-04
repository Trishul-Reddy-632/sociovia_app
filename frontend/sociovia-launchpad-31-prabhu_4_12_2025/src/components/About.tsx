import { Bot, TrendingUp, Users } from "lucide-react";

const About = () => {
  return (
    <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-card">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mb-4 md:mb-6">
            About <span className="text-primary">Sociovia</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We help small businesses automate their ad campaigns, build smart funnels, 
            and sync leads directly into their CRM—all powered by cutting-edge AI technology.
          </p>
        </div>

        {/* Value Propositions */}
       <div className="grid md:grid-cols-3 gap-6 md:gap-8 lg:gap-10 mb-16 md:mb-20">
          
          {/* AI-First */}
          <div className="text-center group p-6 md:p-8 rounded-3xl shadow-soft hover-lift animated-border">
            <div className="w-14 h-14 md:w-16 md:h-16 primary-gradient2 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:shadow-primary">
              <Bot className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-secondary mb-3 md:mb-4">AI-First Approach</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Our advanced AI algorithms optimize your campaigns in real-time, 
              ensuring maximum ROI and performance across all platforms.
            </p>
          </div>

          {/* Smart Automation */}
          <div className="text-center group p-6 md:p-8 rounded-3xl shadow-soft hover-lift animated-border">
            <div className="w-14 h-14 md:w-16 md:h-16 accent-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:shadow-accent">
              <TrendingUp className="w-7 h-7 md:w-8 md:h-8 text-accent-foreground" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-secondary mb-3 md:mb-4">Smart Automation</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Automate complex marketing workflows with intelligent decision-making 
              that adapts to your business needs and market conditions.
            </p>
          </div>

          {/* Small Business */}
          <div className="text-center group p-6 md:p-8 rounded-3xl shadow-soft hover-lift animated-border">
            <div className="w-14 h-14 md:w-16 md:h-16 primary-gradient2 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:shadow-primary">
              <Users className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-secondary mb-3 md:mb-4">Small Business Focus</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Built specifically for small businesses with limited resources, 
              providing enterprise-level capabilities at an affordable price.
            </p>
          </div>

        </div>


        {/* Mission Statement */}
        <div className="text-center feature-gradient p-6 md:p-10 lg:p-12 rounded-3xl shadow-soft">
          <h3 className="text-xl md:text-2xl font-bold text-secondary mb-4 md:mb-6">
            Our Mission
          </h3>
          <p className="text-sm md:text-base text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            To democratize advanced marketing technology by making AI-powered ad automation 
            accessible to every small business, enabling them to compete with larger enterprises 
            and achieve sustainable growth in the digital marketplace.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;