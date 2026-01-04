import { 
  UserPlus, 
  Link, 
  Rocket, 
  Target, 
  BarChart3,
  ArrowRight 
} from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: UserPlus,
      title: "Sign Up",
      description: "Create your Sociovia account in minutes. No complex setup or technical knowledge required.",
      color: "primary"
    },
    {
      icon: Link,
      title: "Connect Meta",
      description: "Securely link your Facebook and Instagram accounts with one-click integration.",
      color: "accent"
    },
    {
      icon: Rocket,
      title: "Launch Ads",
      description: "Our AI creates and launches optimized campaigns based on your business goals and target audience.",
      color: "primary"
    },
    {
      icon: Target,
      title: "Capture Leads",
      description: "High-converting landing pages and funnels automatically capture and qualify your leads.",
      color: "accent"
    },
    {
      icon: BarChart3,
      title: "Track Results",
      description: "Monitor performance in real-time with detailed analytics and AI-powered insights for continuous improvement.",
      color: "primary"
    }
  ];

  return (
    <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mb-4 md:mb-6">
            How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            From setup to success in 5 simple steps. Our AI handles the complexity 
            while you focus on growing your business.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8 md:space-y-0">
          {steps.map((step, index) => {
            // Left side: Sign Up (0), Launch Ads (2), Track Results (4)
            // Right side: Connect Meta (1), Capture Leads (3)
            const isLeftSide = index === 0 || index === 2 || index === 4;
            
            return (
            <div key={index} className="relative">
              {/* Step Card */}
              <div className="grid md:grid-cols-12 gap-4 md:gap-6 items-center">
                {isLeftSide ? (
                  <>
                    {/* Left aligned: Icon first, then content, then empty space */}
                    <div className="md:col-span-2 flex flex-col items-center md:items-end">
                      <div className="relative">
                        <div className={`w-16 h-16 md:w-20 md:h-20 ${step.color === 'primary' ? 'primary-gradient2' : 'accent-gradient'} rounded-3xl flex items-center justify-center shadow-soft transition-smooth`}>
                          <step.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-7 h-7 md:w-8 md:h-8 bg-secondary text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-6">
                      <div className="feature-gradient p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-soft hover-lift text-left">
                        <h3 className="text-lg md:text-xl font-bold text-secondary mb-2 md:mb-3">
                          {step.title}
                        </h3>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3 md:mb-4">
                          {step.description}
                        </p>
                        <div className="flex items-center justify-start text-primary font-semibold text-sm md:text-base">
                          <span>Learn more</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:block md:col-span-4"></div>
                  </>
                ) : (
                  <>
                    {/* Right aligned: Empty space first, then content, then icon */}
                    <div className="hidden md:block md:col-span-4"></div>
                    <div className="md:col-span-6 order-2 md:order-none">
                      <div className="feature-gradient p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-soft hover-lift md:text-right text-left">
                        <h3 className="text-lg md:text-xl font-bold text-secondary mb-2 md:mb-3">
                          {step.title}
                        </h3>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3 md:mb-4">
                          {step.description}
                        </p>
                        <div className="flex items-center md:justify-end justify-start text-accent font-semibold text-sm md:text-base">
                          <span>Learn more</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex flex-col items-center md:items-start order-1 md:order-none">
                      <div className="relative">
                        <div className={`w-16 h-16 md:w-20 md:h-20 ${step.color === 'primary' ? 'primary-gradient2' : 'accent-gradient'} rounded-3xl flex items-center justify-center shadow-soft transition-smooth`}>
                          <step.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-7 h-7 md:w-8 md:h-8 bg-secondary text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className="flex justify-center my-8">
                  <div className="w-px h-16 bg-gradient-to-b from-primary to-accent opacity-30" />
                </div>
              )}
            </div>
          );
          })}
        </div>

        {/* Bottom CTA */}
        {

          /*
          
          <div className="text-center mt-16">
          <div className="feature-gradient p-8 rounded-3xl shadow-soft max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-secondary mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join the waitlist and be among the first to experience 
              the future of AI-powered marketing automation.
            </p>
            <div className="flex items-center justify-center gap-4 text-primary font-semibold">
              <Rocket className="w-5 h-5" />
              <span>Launching Soon in 2025</span>
            </div>
          </div>
        </div>
          
          
          
          */
        }
        
         
      </div>
    </section>
  );
};

export default HowItWorks;