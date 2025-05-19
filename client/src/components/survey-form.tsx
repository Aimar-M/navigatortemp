import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SurveyFormProps {
  tripId: number;
  onComplete: () => void;
}

interface Question {
  question: string;
  type: string;
  options: string[];
}

export default function SurveyForm({ tripId, onComplete }: SurveyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([
    { question: "", type: "text", options: [] }
  ]);

  const handleQuestionChange = (index: number, field: keyof Question, value: string) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev => {
      const updated = [...prev];
      const options = [...updated[questionIndex].options];
      options[optionIndex] = value;
      updated[questionIndex] = { ...updated[questionIndex], options };
      return updated;
    });
  };

  const addOption = (questionIndex: number) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        options: [...updated[questionIndex].options, ""]
      };
      return updated;
    });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev => {
      const updated = [...prev];
      const options = [...updated[questionIndex].options];
      options.splice(optionIndex, 1);
      updated[questionIndex] = { ...updated[questionIndex], options };
      return updated;
    });
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { question: "", type: "text", options: [] }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const isValid = questions.every(q => q.question.trim() !== "" && 
      (q.type !== "multiple_choice" || q.options.length >= 2));
    
    if (!isValid) {
      toast({
        title: "Invalid survey",
        description: "Please complete all questions and ensure multiple choice questions have at least 2 options.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await apiRequest("POST", `/api/trips/${tripId}/survey`, { questions });
      
      toast({
        title: "Survey created",
        description: "Your survey has been created successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/survey`] });
      onComplete();
    } catch (error) {
      toast({
        title: "Failed to create survey",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Trip Survey</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          {questions.map((question, questionIndex) => (
            <div key={questionIndex} className="mb-6 p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between mb-2">
                <h3 className="text-sm font-medium">Question {questionIndex + 1}</h3>
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(questionIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="mb-3">
                <Input
                  placeholder="Enter your question"
                  value={question.question}
                  onChange={(e) => handleQuestionChange(questionIndex, "question", e.target.value)}
                  className="mb-2"
                />
                
                <Select
                  value={question.type}
                  onValueChange={(value) => handleQuestionChange(questionIndex, "type", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Question Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {question.type === "multiple_choice" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">Options</label>
                  
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${optionIndex + 1}`}
                        value={option}
                        onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(questionIndex, optionIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(questionIndex)}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Option
                  </Button>
                </div>
              )}
            </div>
          ))}
          
          <div className="flex flex-col gap-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Question
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Survey"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
