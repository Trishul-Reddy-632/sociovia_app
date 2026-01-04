import { 
  Zap, 
  Target, 
  Database, 
  Brain, 
  ArrowRight 
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: "Automated Ad Campaigns",
      description: "Create, launch, and optimize ad campaigns across multiple platforms with zero manual intervention. Our AI handles bidding, targeting, and budget allocation.",
      gradient: "primary-gradient2"
    },
    {
      icon: Target,
      title: "Smart Funnel Builder",
      description: "Build high-converting sales funnels with drag-and-drop simplicity. AI-powered optimization ensures maximum conversion rates at every step.",
      gradient: "accent-gradient"
    },
    {
      icon: Database,
      title: "Leads Directly in CRM",
      description: "Seamlessly sync all your leads into your preferred CRM system. No data loss, no manual exports—everything flows automatically.",
      gradient: "primary-gradient2"
    },
    {
      icon: Brain,
      title: "AI-driven Optimization",
      description: "Continuous learning algorithms analyze performance data to make real-time adjustments, improving your ROI while you sleep.",
      gradient: "accent-gradient"
    }
  ];

  return (
    <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mb-4 md:mb-6">
            Powerful <span className="text-primary">Features</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Everything you need to automate your marketing and grow your business, 
            powered by advanced AI technology.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group feature-gradient p-6 md:p-8 rounded-3xl shadow-soft hover-lift animated-border"
            >
              <div className="flex items-start gap-4 md:gap-6">
                <div className={`w-14 h-14 md:w-16 md:h-16 ${feature.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:shadow-primary`}>
                  <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-secondary mb-3 md:mb-4 group-hover:text-primary transition-smooth">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4 md:mb-6">
                    {feature.description}
                  </p>
                  
                  <div className="flex items-center text-primary font-semibold group-hover:translate-x-2 transition-smooth">
                    <span className="text-sm md:text-base">Learn more</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        
      </div>
    </section>
  );
};

export default Features;